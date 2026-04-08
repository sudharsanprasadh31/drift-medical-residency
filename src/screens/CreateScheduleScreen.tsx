import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../services/AuthContext';
import {
  createSchedule,
  updateSchedule,
  getScheduleById,
  createBulkShifts,
  getShiftsBySchedule,
  updateShift,
  deleteShift,
} from '../services/scheduleApi';
import { supabase } from '../services/supabase';
import { Profile, OnCallShift, ShiftType, CallType, ScheduleStatus } from '../types';

const scheduleSchema = Yup.object().shape({
  name: Yup.string()
    .required('Schedule name is required')
    .min(3, 'Name must be at least 3 characters'),
  start_date: Yup.date().required('Start date is required'),
  end_date: Yup.date()
    .required('End date is required')
    .min(Yup.ref('start_date'), 'End date must be after start date'),
  notes: Yup.string(),
});

interface ShiftFormData {
  id?: string;
  resident_id: string;
  shift_date: string;
  shift_type: ShiftType;
  call_type: CallType | null;
  start_time: string;
  end_time: string;
  notes: string;
}

export default function CreateScheduleScreen({ route, navigation }: any) {
  const { scheduleId } = route.params || {};
  const { profile } = useAuth();
  const [loading, setLoading] = useState(!!scheduleId);
  const [saving, setSaving] = useState(false);
  const [residents, setResidents] = useState<Profile[]>([]);
  const [shifts, setShifts] = useState<ShiftFormData[]>([]);
  const [initialValues, setInitialValues] = useState({
    name: '',
    start_date: '',
    end_date: '',
    status: 'draft' as ScheduleStatus,
    notes: '',
  });

  const isEditMode = !!scheduleId;

  useEffect(() => {
    loadResidents();
    if (scheduleId) {
      loadSchedule();
    }
  }, [scheduleId]);

  const loadResidents = async () => {
    if (!profile?.program_id) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('program_id', profile.program_id)
        .eq('role', 'resident')
        .eq('is_approved', true)
        .order('last_name');

      if (error) throw error;
      setResidents(data || []);
    } catch (error: any) {
      console.error('Error loading residents:', error);
      Alert.alert('Error', 'Failed to load residents');
    }
  };

  const loadSchedule = async () => {
    try {
      const [scheduleData, shiftsData] = await Promise.all([
        getScheduleById(scheduleId),
        getShiftsBySchedule(scheduleId),
      ]);

      setInitialValues({
        name: scheduleData.name,
        start_date: scheduleData.start_date,
        end_date: scheduleData.end_date,
        status: scheduleData.status,
        notes: scheduleData.notes || '',
      });

      setShifts(
        shiftsData.map((shift) => ({
          id: shift.id,
          resident_id: shift.resident_id,
          shift_date: shift.shift_date,
          shift_type: shift.shift_type,
          call_type: shift.call_type,
          start_time: shift.start_time,
          end_time: shift.end_time,
          notes: shift.notes || '',
        }))
      );
    } catch (error: any) {
      console.error('Error loading schedule:', error);
      Alert.alert('Error', 'Failed to load schedule');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (values: typeof initialValues) => {
    if (!profile?.program_id) {
      Alert.alert('Error', 'Program not found');
      return;
    }

    setSaving(true);
    try {
      let currentScheduleId = scheduleId;

      if (isEditMode) {
        await updateSchedule(scheduleId, values);
      } else {
        const newSchedule = await createSchedule({
          ...values,
          program_id: profile.program_id,
          created_by: profile.id,
        });
        currentScheduleId = newSchedule.id;
      }

      // Save shifts
      await saveShifts(currentScheduleId);

      Alert.alert(
        'Success',
        `Schedule ${isEditMode ? 'updated' : 'created'} successfully`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error saving schedule:', error);
      Alert.alert('Error', error.message || 'Failed to save schedule');
    } finally {
      setSaving(false);
    }
  };

  const saveShifts = async (currentScheduleId: string) => {
    // Separate new shifts from existing shifts
    const newShifts = shifts.filter((s) => !s.id);
    const existingShifts = shifts.filter((s) => s.id);

    // Create new shifts
    if (newShifts.length > 0) {
      const shiftsToCreate = newShifts.map((shift) => ({
        schedule_id: currentScheduleId,
        resident_id: shift.resident_id,
        shift_date: shift.shift_date,
        shift_type: shift.shift_type,
        call_type: shift.call_type,
        start_time: shift.start_time,
        end_time: shift.end_time,
        is_post_call_day: false,
        notes: shift.notes || null,
      }));
      await createBulkShifts(shiftsToCreate);
    }

    // Update existing shifts
    for (const shift of existingShifts) {
      if (shift.id) {
        await updateShift(shift.id, {
          resident_id: shift.resident_id,
          shift_date: shift.shift_date,
          shift_type: shift.shift_type,
          call_type: shift.call_type,
          start_time: shift.start_time,
          end_time: shift.end_time,
          notes: shift.notes || null,
        });
      }
    }

    // Delete removed shifts (if editing)
    if (isEditMode) {
      const originalShifts = await getShiftsBySchedule(currentScheduleId);
      const currentShiftIds = shifts.filter((s) => s.id).map((s) => s.id);
      const shiftsToDelete = originalShifts.filter((s) => !currentShiftIds.includes(s.id));

      for (const shift of shiftsToDelete) {
        await deleteShift(shift.id);
      }
    }
  };

  const addShift = () => {
    const newShift: ShiftFormData = {
      resident_id: residents[0]?.id || '',
      shift_date: initialValues.start_date || new Date().toISOString().split('T')[0],
      shift_type: 'day',
      call_type: null,
      start_time: '08:00',
      end_time: '17:00',
      notes: '',
    };
    setShifts([...shifts, newShift]);
  };

  const removeShift = (index: number) => {
    Alert.alert('Remove Shift', 'Are you sure you want to remove this shift?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          const newShifts = [...shifts];
          newShifts.splice(index, 1);
          setShifts(newShifts);
        },
      },
    ]);
  };

  const updateShiftField = (index: number, field: keyof ShiftFormData, value: any) => {
    const newShifts = [...shifts];
    newShifts[index] = { ...newShifts[index], [field]: value };
    setShifts(newShifts);
  };

  const generateRotatingSchedule = () => {
    Alert.alert(
      'Generate Rotating Schedule',
      'This will create rotating call shifts for all residents. Any existing shifts will be removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          onPress: () => {
            if (!initialValues.start_date || !initialValues.end_date) {
              Alert.alert('Error', 'Please set start and end dates first');
              return;
            }

            if (residents.length === 0) {
              Alert.alert('Error', 'No residents available');
              return;
            }

            const start = new Date(initialValues.start_date);
            const end = new Date(initialValues.end_date);
            const generatedShifts: ShiftFormData[] = [];
            let residentIndex = 0;

            for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
              const shift: ShiftFormData = {
                resident_id: residents[residentIndex % residents.length].id,
                shift_date: date.toISOString().split('T')[0],
                shift_type: 'call_24hr',
                call_type: 'in_house',
                start_time: '08:00',
                end_time: '08:00',
                notes: '',
              };
              generatedShifts.push(shift);
              residentIndex++;
            }

            setShifts(generatedShifts);
            Alert.alert('Success', `Generated ${generatedShifts.length} rotating shifts`);
          },
        },
      ]
    );
  };

  const formatShiftType = (type: ShiftType) => {
    const labels: { [key in ShiftType]: string } = {
      call_24hr: '24hr Call',
      day: 'Day',
      evening: 'Evening',
      night: 'Night',
      weekend: 'Weekend',
      holiday: 'Holiday',
    };
    return labels[type];
  };

  const getResidentName = (residentId: string) => {
    const resident = residents.find((r) => r.id === residentId);
    return resident ? `${resident.first_name} ${resident.last_name}` : 'Unknown';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Formik
        initialValues={initialValues}
        validationSchema={scheduleSchema}
        onSubmit={handleSave}
        enableReinitialize
      >
        {({ values, errors, touched, handleChange, handleBlur, handleSubmit, setFieldValue }) => (
          <>
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
              {/* Basic Info */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Schedule Information</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Schedule Name *</Text>
                  <TextInput
                    style={[styles.input, errors.name && touched.name && styles.inputError]}
                    value={values.name}
                    onChangeText={handleChange('name')}
                    onBlur={handleBlur('name')}
                    placeholder="e.g., January 2026 Call Schedule"
                  />
                  {errors.name && touched.name && (
                    <Text style={styles.errorText}>{errors.name}</Text>
                  )}
                </View>

                <View style={styles.row}>
                  <View style={[styles.inputGroup, styles.flex1]}>
                    <Text style={styles.label}>Start Date *</Text>
                    <TextInput
                      style={[
                        styles.input,
                        errors.start_date && touched.start_date && styles.inputError,
                      ]}
                      value={values.start_date}
                      onChangeText={handleChange('start_date')}
                      onBlur={handleBlur('start_date')}
                      placeholder="YYYY-MM-DD"
                    />
                    {errors.start_date && touched.start_date && (
                      <Text style={styles.errorText}>{errors.start_date}</Text>
                    )}
                  </View>

                  <View style={styles.spacer} />

                  <View style={[styles.inputGroup, styles.flex1]}>
                    <Text style={styles.label}>End Date *</Text>
                    <TextInput
                      style={[
                        styles.input,
                        errors.end_date && touched.end_date && styles.inputError,
                      ]}
                      value={values.end_date}
                      onChangeText={handleChange('end_date')}
                      onBlur={handleBlur('end_date')}
                      placeholder="YYYY-MM-DD"
                    />
                    {errors.end_date && touched.end_date && (
                      <Text style={styles.errorText}>{errors.end_date}</Text>
                    )}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Status</Text>
                  <View style={styles.statusButtons}>
                    <TouchableOpacity
                      style={[
                        styles.statusButton,
                        values.status === 'draft' && styles.statusButtonActive,
                      ]}
                      onPress={() => setFieldValue('status', 'draft')}
                    >
                      <Text
                        style={[
                          styles.statusButtonText,
                          values.status === 'draft' && styles.statusButtonTextActive,
                        ]}
                      >
                        Draft
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.statusButton,
                        values.status === 'published' && styles.statusButtonActive,
                      ]}
                      onPress={() => setFieldValue('status', 'published')}
                    >
                      <Text
                        style={[
                          styles.statusButtonText,
                          values.status === 'published' && styles.statusButtonTextActive,
                        ]}
                      >
                        Published
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.statusButton,
                        values.status === 'archived' && styles.statusButtonActive,
                      ]}
                      onPress={() => setFieldValue('status', 'archived')}
                    >
                      <Text
                        style={[
                          styles.statusButtonText,
                          values.status === 'archived' && styles.statusButtonTextActive,
                        ]}
                      >
                        Archived
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Notes</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={values.notes}
                    onChangeText={handleChange('notes')}
                    onBlur={handleBlur('notes')}
                    placeholder="Additional notes or instructions..."
                    multiline
                    numberOfLines={4}
                  />
                </View>
              </View>

              {/* Shifts Section */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Shifts</Text>
                  <TouchableOpacity style={styles.generateButton} onPress={generateRotatingSchedule}>
                    <Text style={styles.generateButtonText}>Generate Rotating</Text>
                  </TouchableOpacity>
                </View>

                {shifts.length === 0 ? (
                  <View style={styles.emptyShifts}>
                    <Text style={styles.emptyText}>No shifts added yet</Text>
                  </View>
                ) : (
                  shifts.map((shift, index) => (
                    <View key={index} style={styles.shiftCard}>
                      <View style={styles.shiftCardHeader}>
                        <Text style={styles.shiftCardTitle}>Shift {index + 1}</Text>
                        <TouchableOpacity onPress={() => removeShift(index)}>
                          <Text style={styles.removeButton}>Remove</Text>
                        </TouchableOpacity>
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Resident</Text>
                        <View style={styles.pickerContainer}>
                          <Text style={styles.pickerText}>{getResidentName(shift.resident_id)}</Text>
                        </View>
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Date</Text>
                        <TextInput
                          style={styles.input}
                          value={shift.shift_date}
                          onChangeText={(text) => updateShiftField(index, 'shift_date', text)}
                          placeholder="YYYY-MM-DD"
                        />
                      </View>

                      <View style={styles.row}>
                        <View style={[styles.inputGroup, styles.flex1]}>
                          <Text style={styles.label}>Shift Type</Text>
                          <View style={styles.pickerContainer}>
                            <Text style={styles.pickerText}>
                              {formatShiftType(shift.shift_type)}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.spacer} />

                        <View style={[styles.inputGroup, styles.flex1]}>
                          <Text style={styles.label}>Call Type</Text>
                          <View style={styles.pickerContainer}>
                            <Text style={styles.pickerText}>
                              {shift.call_type ? shift.call_type.replace('_', ' ') : 'None'}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.row}>
                        <View style={[styles.inputGroup, styles.flex1]}>
                          <Text style={styles.label}>Start Time</Text>
                          <TextInput
                            style={styles.input}
                            value={shift.start_time}
                            onChangeText={(text) => updateShiftField(index, 'start_time', text)}
                            placeholder="HH:MM"
                          />
                        </View>

                        <View style={styles.spacer} />

                        <View style={[styles.inputGroup, styles.flex1]}>
                          <Text style={styles.label}>End Time</Text>
                          <TextInput
                            style={styles.input}
                            value={shift.end_time}
                            onChangeText={(text) => updateShiftField(index, 'end_time', text)}
                            placeholder="HH:MM"
                          />
                        </View>
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Notes</Text>
                        <TextInput
                          style={styles.input}
                          value={shift.notes}
                          onChangeText={(text) => updateShiftField(index, 'notes', text)}
                          placeholder="Optional notes"
                        />
                      </View>
                    </View>
                  ))
                )}

                <TouchableOpacity style={styles.addShiftButton} onPress={addShift}>
                  <Text style={styles.addShiftButtonText}>+ Add Shift</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => navigation.goBack()}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={() => handleSubmit()}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {isEditMode ? 'Update' : 'Create'} Schedule
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </Formik>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#2c3e50',
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#e74c3c',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 12,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
  },
  flex1: {
    flex: 1,
  },
  spacer: {
    width: 12,
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  statusButtonActive: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  statusButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  statusButtonTextActive: {
    color: '#fff',
  },
  generateButton: {
    backgroundColor: '#9b59b6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyShifts: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  shiftCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  shiftCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  shiftCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  removeButton: {
    color: '#e74c3c',
    fontSize: 14,
    fontWeight: '600',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  pickerText: {
    fontSize: 16,
    color: '#2c3e50',
    textTransform: 'capitalize',
  },
  addShiftButton: {
    borderWidth: 2,
    borderColor: '#3498db',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  addShiftButtonText: {
    color: '#3498db',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#3498db',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
