import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useAuth } from '../services/AuthContext';
import {
  getSwapRequests,
  createSwapRequest,
  respondToSwapRequest,
  getShiftsByResident,
} from '../services/scheduleApi';
import { ShiftSwapRequest, OnCallShift } from '../types';

export default function SwapRequestsScreen({ navigation }: any) {
  const { profile } = useAuth();
  const [swapRequests, setSwapRequests] = useState<ShiftSwapRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [myShifts, setMyShifts] = useState<OnCallShift[]>([]);
  const [selectedShift, setSelectedShift] = useState<string>('');
  const [swapReason, setSwapReason] = useState('');
  const [creatingSwap, setCreatingSwap] = useState(false);

  const canManage = profile?.role === 'chief_resident' || profile?.role === 'admin';

  useEffect(() => {
    loadSwapRequests();
    if (profile?.id) {
      loadMyShifts();
    }
  }, [profile]);

  const loadSwapRequests = async () => {
    if (!profile?.id) return;

    try {
      const data = await getSwapRequests(profile.id);
      setSwapRequests(data);
    } catch (error: any) {
      console.error('Error loading swap requests:', error);
      Alert.alert('Error', 'Failed to load swap requests');
    } finally {
      setLoading(false);
    }
  };

  const loadMyShifts = async () => {
    if (!profile?.id) return;

    try {
      // Get upcoming shifts (next 3 months)
      const today = new Date();
      const threeMonthsLater = new Date();
      threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

      const shifts = await getShiftsByResident(
        profile.id,
        today.toISOString().split('T')[0],
        threeMonthsLater.toISOString().split('T')[0]
      );

      setMyShifts(shifts);
    } catch (error: any) {
      console.error('Error loading shifts:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSwapRequests();
    setRefreshing(false);
  };

  const handleCreateSwap = async () => {
    if (!selectedShift) {
      Alert.alert('Error', 'Please select a shift to swap');
      return;
    }

    if (!swapReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for the swap');
      return;
    }

    setCreatingSwap(true);
    try {
      await createSwapRequest({
        requesting_resident_id: profile!.id,
        target_resident_id: '', // Will be filled by chief resident
        requesting_shift_id: selectedShift,
        target_shift_id: null,
        status: 'pending',
        reason: swapReason,
      });

      Alert.alert('Success', 'Swap request submitted successfully');
      setShowCreateModal(false);
      setSelectedShift('');
      setSwapReason('');
      await loadSwapRequests();
    } catch (error: any) {
      console.error('Error creating swap request:', error);
      Alert.alert('Error', error.message || 'Failed to create swap request');
    } finally {
      setCreatingSwap(false);
    }
  };

  const handleApprove = (swapId: string) => {
    Alert.alert(
      'Approve Swap',
      'Are you sure you want to approve this shift swap?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              await respondToSwapRequest(swapId, 'approved', profile!.id);
              Alert.alert('Success', 'Swap request approved');
              await loadSwapRequests();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const handleReject = (swapId: string) => {
    Alert.alert(
      'Reject Swap',
      'Are you sure you want to reject this shift swap?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await respondToSwapRequest(swapId, 'rejected', profile!.id);
              Alert.alert('Success', 'Swap request rejected');
              await loadSwapRequests();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return '#27ae60';
      case 'rejected':
        return '#e74c3c';
      case 'cancelled':
        return '#95a5a6';
      default:
        return '#f39c12';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const filteredRequests = swapRequests.filter((request) => {
    if (filter === 'all') return true;
    return request.status === filter;
  });

  const renderSwapRequest = (swap: ShiftSwapRequest) => {
    const isRequesting = swap.requesting_resident_id === profile?.id;
    const isPending = swap.status === 'pending';
    const showActions = canManage && isPending;

    return (
      <View key={swap.id} style={styles.swapCard}>
        <View style={styles.swapHeader}>
          <View style={styles.swapHeaderLeft}>
            <Text style={styles.swapTitle}>
              {isRequesting ? 'Your Request' : 'Incoming Request'}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(swap.status) }]}>
              <Text style={styles.statusText}>{getStatusLabel(swap.status)}</Text>
            </View>
          </View>
          <Text style={styles.swapDate}>
            {new Date(swap.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </Text>
        </View>

        <View style={styles.swapBody}>
          {/* Requesting Resident */}
          <View style={styles.residentSection}>
            <Text style={styles.residentLabel}>Requesting:</Text>
            <Text style={styles.residentName}>
              {swap.requesting_resident?.first_name} {swap.requesting_resident?.last_name}
            </Text>
            {swap.requesting_shift && (
              <View style={styles.shiftInfo}>
                <Text style={styles.shiftDate}>
                  {new Date(swap.requesting_shift.shift_date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
                <Text style={styles.shiftType}>
                  {formatShiftType(swap.requesting_shift.shift_type)}
                </Text>
                <Text style={styles.shiftTime}>
                  {swap.requesting_shift.start_time} - {swap.requesting_shift.end_time}
                </Text>
              </View>
            )}
          </View>

          {/* Target Resident (if specified) */}
          {swap.target_resident && (
            <>
              <View style={styles.swapArrow}>
                <Text style={styles.swapArrowText}>⇄</Text>
              </View>
              <View style={styles.residentSection}>
                <Text style={styles.residentLabel}>With:</Text>
                <Text style={styles.residentName}>
                  {swap.target_resident?.first_name} {swap.target_resident?.last_name}
                </Text>
                {swap.target_shift && (
                  <View style={styles.shiftInfo}>
                    <Text style={styles.shiftDate}>
                      {new Date(swap.target_shift.shift_date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                    <Text style={styles.shiftType}>
                      {formatShiftType(swap.target_shift.shift_type)}
                    </Text>
                    <Text style={styles.shiftTime}>
                      {swap.target_shift.start_time} - {swap.target_shift.end_time}
                    </Text>
                  </View>
                )}
              </View>
            </>
          )}
        </View>

        {swap.reason && (
          <View style={styles.reasonSection}>
            <Text style={styles.reasonLabel}>Reason:</Text>
            <Text style={styles.reasonText}>{swap.reason}</Text>
          </View>
        )}

        {swap.review_notes && (
          <View style={styles.reviewSection}>
            <Text style={styles.reviewLabel}>Review Notes:</Text>
            <Text style={styles.reviewText}>{swap.review_notes}</Text>
          </View>
        )}

        {showActions && (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.approveButton}
              onPress={() => handleApprove(swap.id)}
            >
              <Text style={styles.approveButtonText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.rejectButton}
              onPress={() => handleReject(swap.id)}
            >
              <Text style={styles.rejectButtonText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
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
      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterTabText, filter === 'all' && styles.filterTabTextActive]}>
            All ({swapRequests.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'pending' && styles.filterTabActive]}
          onPress={() => setFilter('pending')}
        >
          <Text
            style={[styles.filterTabText, filter === 'pending' && styles.filterTabTextActive]}
          >
            Pending ({swapRequests.filter((r) => r.status === 'pending').length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'approved' && styles.filterTabActive]}
          onPress={() => setFilter('approved')}
        >
          <Text
            style={[styles.filterTabText, filter === 'approved' && styles.filterTabTextActive]}
          >
            Approved
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'rejected' && styles.filterTabActive]}
          onPress={() => setFilter('rejected')}
        >
          <Text
            style={[styles.filterTabText, filter === 'rejected' && styles.filterTabTextActive]}
          >
            Rejected
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredRequests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No {filter !== 'all' && filter} swap requests</Text>
          </View>
        ) : (
          filteredRequests.map(renderSwapRequest)
        )}
      </ScrollView>

      {/* Create Request Button */}
      {!canManage && (
        <TouchableOpacity style={styles.fab} onPress={() => setShowCreateModal(true)}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}

      {/* Create Swap Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Request Shift Swap</Text>

            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>Select Shift to Swap</Text>
              <ScrollView style={styles.shiftsList}>
                {myShifts.map((shift) => (
                  <TouchableOpacity
                    key={shift.id}
                    style={[
                      styles.shiftOption,
                      selectedShift === shift.id && styles.shiftOptionSelected,
                    ]}
                    onPress={() => setSelectedShift(shift.id)}
                  >
                    <Text style={styles.shiftOptionDate}>
                      {new Date(shift.shift_date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                    <Text style={styles.shiftOptionType}>
                      {formatShiftType(shift.shift_type)}
                    </Text>
                    <Text style={styles.shiftOptionTime}>
                      {shift.start_time} - {shift.end_time}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[styles.modalLabel, { marginTop: 16 }]}>Reason for Swap</Text>
              <TextInput
                style={styles.reasonInput}
                value={swapReason}
                onChangeText={setSwapReason}
                placeholder="e.g., Family emergency, personal conflict..."
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowCreateModal(false);
                  setSelectedShift('');
                  setSwapReason('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitButton, creatingSwap && styles.modalSubmitDisabled]}
                onPress={handleCreateSwap}
                disabled={creatingSwap}
              >
                {creatingSwap ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalSubmitText}>Submit Request</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  filterTabActive: {
    borderBottomColor: '#3498db',
  },
  filterTabText: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: '#3498db',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  emptyContainer: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  swapCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  swapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  swapHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  swapTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  swapDate: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  swapBody: {
    marginBottom: 12,
  },
  residentSection: {
    marginBottom: 12,
  },
  residentLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  residentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  shiftInfo: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
  },
  shiftDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  shiftType: {
    fontSize: 14,
    color: '#3498db',
    marginBottom: 4,
  },
  shiftTime: {
    fontSize: 13,
    color: '#7f8c8d',
  },
  swapArrow: {
    alignItems: 'center',
    marginVertical: 8,
  },
  swapArrowText: {
    fontSize: 24,
    color: '#3498db',
  },
  reasonSection: {
    backgroundColor: '#fff9e6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  reasonLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 14,
    color: '#856404',
  },
  reviewSection: {
    backgroundColor: '#e8f5e9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  reviewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2e7d32',
    marginBottom: 4,
  },
  reviewText: {
    fontSize: 14,
    color: '#2e7d32',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  approveButton: {
    flex: 1,
    backgroundColor: '#27ae60',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  approveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e74c3c',
  },
  rejectButtonText: {
    color: '#e74c3c',
    fontSize: 14,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  fabText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '300',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  modalBody: {
    padding: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  shiftsList: {
    maxHeight: 200,
  },
  shiftOption: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 8,
  },
  shiftOptionSelected: {
    borderColor: '#3498db',
    backgroundColor: '#e3f2fd',
  },
  shiftOptionDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  shiftOptionType: {
    fontSize: 13,
    color: '#3498db',
    marginBottom: 2,
  },
  shiftOptionTime: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#2c3e50',
    height: 100,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  modalSubmitButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#3498db',
  },
  modalSubmitDisabled: {
    opacity: 0.6,
  },
  modalSubmitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
