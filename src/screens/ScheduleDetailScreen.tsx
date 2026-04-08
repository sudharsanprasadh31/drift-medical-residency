import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../services/AuthContext';
import { getScheduleById, getShiftsBySchedule, publishSchedule, deleteSchedule } from '../services/scheduleApi';
import { OnCallSchedule, OnCallShift } from '../types';

export default function ScheduleDetailScreen({ route, navigation }: any) {
  const { scheduleId } = route.params;
  const { profile } = useAuth();
  const [schedule, setSchedule] = useState<OnCallSchedule | null>(null);
  const [shifts, setShifts] = useState<OnCallShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const canManage = profile?.role === 'chief_resident' || profile?.role === 'admin';

  useEffect(() => {
    loadScheduleData();
  }, [scheduleId]);

  const loadScheduleData = async () => {
    try {
      const [scheduleData, shiftsData] = await Promise.all([
        getScheduleById(scheduleId),
        getShiftsBySchedule(scheduleId),
      ]);
      setSchedule(scheduleData);
      setShifts(shiftsData);
    } catch (error: any) {
      console.error('Error loading schedule:', error);
      Alert.alert('Error', 'Failed to load schedule details');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadScheduleData();
    setRefreshing(false);
  };

  const handlePublish = () => {
    Alert.alert(
      'Publish Schedule',
      'Are you sure you want to publish this schedule? Residents will be notified.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Publish',
          style: 'default',
          onPress: async () => {
            try {
              await publishSchedule(scheduleId);
              Alert.alert('Success', 'Schedule published successfully');
              await loadScheduleData();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Schedule',
      'Are you sure you want to delete this schedule? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSchedule(scheduleId);
              Alert.alert('Success', 'Schedule deleted');
              navigation.goBack();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const groupShiftsByDate = () => {
    const grouped: { [key: string]: OnCallShift[] } = {};
    shifts.forEach((shift) => {
      if (!grouped[shift.shift_date]) {
        grouped[shift.shift_date] = [];
      }
      grouped[shift.shift_date].push(shift);
    });
    return grouped;
  };

  const formatShiftType = (type: string) => {
    const labels: { [key: string]: string } = {
      call_24hr: '24hr Call',
      day: 'Day',
      evening: 'Evening',
      night: 'Night',
      weekend: 'Weekend',
      holiday: 'Holiday',
    };
    return labels[type] || type;
  };

  const getShiftTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      call_24hr: '#e74c3c',
      day: '#3498db',
      evening: '#9b59b6',
      night: '#34495e',
      weekend: '#16a085',
      holiday: '#e67e22',
    };
    return colors[type] || '#7f8c8d';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  if (!schedule) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Schedule not found</Text>
      </View>
    );
  }

  const groupedShifts = groupShiftsByDate();
  const dates = Object.keys(groupedShifts).sort();

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header Info */}
        <View style={styles.header}>
          <Text style={styles.scheduleName}>{schedule.name}</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{schedule.status.toUpperCase()}</Text>
          </View>
        </View>

        {/* Date Range */}
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Date Range:</Text>
          <Text style={styles.infoValue}>
            {new Date(schedule.start_date).toLocaleDateString()} -{' '}
            {new Date(schedule.end_date).toLocaleDateString()}
          </Text>

          {schedule.notes && (
            <>
              <Text style={[styles.infoLabel, { marginTop: 12 }]}>Notes:</Text>
              <Text style={styles.infoValue}>{schedule.notes}</Text>
            </>
          )}

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{shifts.length}</Text>
              <Text style={styles.statLabel}>Total Shifts</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {[...new Set(shifts.map((s) => s.resident_id))].length}
              </Text>
              <Text style={styles.statLabel}>Residents</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        {canManage && (
          <View style={styles.actionsCard}>
            {schedule.status === 'draft' && (
              <TouchableOpacity style={styles.publishButton} onPress={handlePublish}>
                <Text style={styles.publishButtonText}>Publish Schedule</Text>
              </TouchableOpacity>
            )}

            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() =>
                  navigation.navigate('CreateSchedule', { scheduleId: schedule.id })
                }
              >
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Shifts by Date */}
        <View style={styles.shiftsSection}>
          <Text style={styles.sectionTitle}>Shifts</Text>

          {dates.length === 0 ? (
            <View style={styles.emptyShifts}>
              <Text style={styles.emptyText}>No shifts scheduled yet</Text>
              {canManage && (
                <TouchableOpacity
                  style={styles.addShiftButton}
                  onPress={() =>
                    navigation.navigate('CreateSchedule', { scheduleId: schedule.id })
                  }
                >
                  <Text style={styles.addShiftButtonText}>Add Shifts</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            dates.map((date) => (
              <View key={date} style={styles.dateGroup}>
                <Text style={styles.dateHeader}>
                  {new Date(date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
                {groupedShifts[date].map((shift) => (
                  <View key={shift.id} style={styles.shiftCard}>
                    <View
                      style={[
                        styles.shiftTypeIndicator,
                        { backgroundColor: getShiftTypeColor(shift.shift_type) },
                      ]}
                    />
                    <View style={styles.shiftContent}>
                      <View style={styles.shiftHeader}>
                        <Text style={styles.residentName}>
                          {shift.resident?.first_name} {shift.resident?.last_name}
                        </Text>
                        <Text
                          style={[
                            styles.shiftType,
                            { color: getShiftTypeColor(shift.shift_type) },
                          ]}
                        >
                          {formatShiftType(shift.shift_type)}
                        </Text>
                      </View>
                      <Text style={styles.shiftTime}>
                        {shift.start_time} - {shift.end_time}
                      </Text>
                      {shift.call_type && (
                        <Text style={styles.callType}>
                          {shift.call_type.replace('_', ' ')}
                        </Text>
                      )}
                      {shift.notes && (
                        <Text style={styles.shiftNotes}>{shift.notes}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            ))
          )}
        </View>
      </ScrollView>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  scheduleName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
  },
  statusBadge: {
    backgroundColor: '#3498db',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 12,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7f8c8d',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#2c3e50',
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#3498db',
  },
  statLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 4,
  },
  actionsCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 12,
  },
  publishButton: {
    backgroundColor: '#27ae60',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  publishButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    flex: 1,
    backgroundColor: '#3498db',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e74c3c',
  },
  deleteButtonText: {
    color: '#e74c3c',
    fontSize: 14,
    fontWeight: '600',
  },
  shiftsSection: {
    padding: 16,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  emptyShifts: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 16,
  },
  addShiftButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addShiftButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dateGroup: {
    marginBottom: 24,
  },
  dateHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  shiftCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  shiftTypeIndicator: {
    width: 4,
  },
  shiftContent: {
    flex: 1,
    padding: 12,
  },
  shiftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  residentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  shiftType: {
    fontSize: 12,
    fontWeight: '600',
  },
  shiftTime: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  callType: {
    fontSize: 12,
    color: '#95a5a6',
    textTransform: 'capitalize',
  },
  shiftNotes: {
    fontSize: 12,
    color: '#95a5a6',
    fontStyle: 'italic',
    marginTop: 4,
  },
});
