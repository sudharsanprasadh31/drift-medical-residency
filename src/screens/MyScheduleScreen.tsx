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
} from 'react-native';
import { useAuth } from '../services/AuthContext';
import { getShiftsByResident, getResidentScheduleStats } from '../services/scheduleApi';
import { OnCallShift } from '../types';

export default function MyScheduleScreen({ navigation }: any) {
  const { profile } = useAuth();
  const [shifts, setShifts] = useState<OnCallShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [stats, setStats] = useState({
    totalShifts: 0,
    callShifts: 0,
    totalHours: 0,
    averageHoursPerWeek: 0,
    violations: 0,
  });

  useEffect(() => {
    loadSchedule();
  }, [profile, selectedMonth]);

  const loadSchedule = async () => {
    if (!profile?.id) return;

    try {
      // Get current month date range
      const startOfMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
      const endOfMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);

      const startDate = startOfMonth.toISOString().split('T')[0];
      const endDate = endOfMonth.toISOString().split('T')[0];

      const [shiftsData, statsData] = await Promise.all([
        getShiftsByResident(profile.id, startDate, endDate),
        getResidentScheduleStats(profile.id, startDate, endDate),
      ]);

      setShifts(shiftsData);
      setStats(statsData);
    } catch (error: any) {
      console.error('Error loading schedule:', error);
      Alert.alert('Error', 'Failed to load your schedule');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSchedule();
    setRefreshing(false);
  };

  const changeMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(selectedMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setSelectedMonth(newMonth);
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

  const formatMonthYear = () => {
    return selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
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
        {/* Month Selector */}
        <View style={styles.monthSelector}>
          <TouchableOpacity style={styles.monthButton} onPress={() => changeMonth('prev')}>
            <Text style={styles.monthButtonText}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={styles.monthTitle}>{formatMonthYear()}</Text>
          <TouchableOpacity style={styles.monthButton} onPress={() => changeMonth('next')}>
            <Text style={styles.monthButtonText}>{'>'}</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Overview */}
        <View style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalShifts}</Text>
              <Text style={styles.statLabel}>Total Shifts</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.callShifts}</Text>
              <Text style={styles.statLabel}>Call Shifts</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{Math.round(stats.totalHours)}</Text>
              <Text style={styles.statLabel}>Total Hours</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{Math.round(stats.averageHoursPerWeek)}</Text>
              <Text style={styles.statLabel}>Avg Hours/Week</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text
                style={[
                  styles.statValue,
                  stats.violations > 0 ? styles.violationText : styles.complianceText,
                ]}
              >
                {stats.violations}
              </Text>
              <Text style={styles.statLabel}>Violations</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text
                style={[
                  styles.statValue,
                  stats.averageHoursPerWeek > 80 ? styles.violationText : styles.complianceText,
                ]}
              >
                {stats.averageHoursPerWeek > 80 ? 'Over' : 'OK'}
              </Text>
              <Text style={styles.statLabel}>ACGME</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsCard}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('SwapRequests')}
          >
            <Text style={styles.actionButtonText}>Request Shift Swap</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Compliance')}
          >
            <Text style={styles.actionButtonText}>View Duty Hours</Text>
          </TouchableOpacity>
        </View>

        {/* Shifts Calendar */}
        <View style={styles.shiftsSection}>
          <Text style={styles.sectionTitle}>Your Shifts</Text>

          {dates.length === 0 ? (
            <View style={styles.emptyShifts}>
              <Text style={styles.emptyText}>No shifts scheduled for this month</Text>
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
                  <TouchableOpacity
                    key={shift.id}
                    style={styles.shiftCard}
                    onPress={() =>
                      navigation.navigate('ScheduleDetail', { scheduleId: shift.schedule_id })
                    }
                  >
                    <View
                      style={[
                        styles.shiftTypeIndicator,
                        { backgroundColor: getShiftTypeColor(shift.shift_type) },
                      ]}
                    />
                    <View style={styles.shiftContent}>
                      <View style={styles.shiftHeader}>
                        <Text
                          style={[
                            styles.shiftType,
                            { color: getShiftTypeColor(shift.shift_type) },
                          ]}
                        >
                          {formatShiftType(shift.shift_type)}
                        </Text>
                        {shift.schedule?.name && (
                          <Text style={styles.scheduleName}>{shift.schedule.name}</Text>
                        )}
                      </View>
                      <Text style={styles.shiftTime}>
                        {shift.start_time} - {shift.end_time}
                      </Text>
                      {shift.call_type && (
                        <View style={styles.callTypeBadge}>
                          <Text style={styles.callTypeText}>
                            {shift.call_type.replace('_', ' ')}
                          </Text>
                        </View>
                      )}
                      {shift.notes && <Text style={styles.shiftNotes}>{shift.notes}</Text>}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ))
          )}
        </View>

        {/* ACGME Compliance Warning */}
        {stats.averageHoursPerWeek > 80 && (
          <View style={styles.warningCard}>
            <Text style={styles.warningTitle}>⚠️ ACGME Compliance Warning</Text>
            <Text style={styles.warningText}>
              You are averaging {Math.round(stats.averageHoursPerWeek)} hours per week, which
              exceeds the ACGME limit of 80 hours averaged over 4 weeks.
            </Text>
            <TouchableOpacity
              style={styles.warningButton}
              onPress={() => navigation.navigate('Compliance')}
            >
              <Text style={styles.warningButtonText}>View Details</Text>
            </TouchableOpacity>
          </View>
        )}
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
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  monthButton: {
    padding: 8,
  },
  monthButtonText: {
    fontSize: 24,
    color: '#3498db',
    fontWeight: 'bold',
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  statsCard: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#ecf0f1',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#3498db',
  },
  statLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4,
    textAlign: 'center',
  },
  violationText: {
    color: '#e74c3c',
  },
  complianceText: {
    color: '#27ae60',
  },
  actionsCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 12,
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#3498db',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
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
  shiftType: {
    fontSize: 16,
    fontWeight: '600',
  },
  scheduleName: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  shiftTime: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  callTypeBadge: {
    backgroundColor: '#ecf0f1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  callTypeText: {
    fontSize: 12,
    color: '#2c3e50',
    textTransform: 'capitalize',
    fontWeight: '600',
  },
  shiftNotes: {
    fontSize: 12,
    color: '#95a5a6',
    fontStyle: 'italic',
    marginTop: 4,
  },
  warningCard: {
    backgroundColor: '#fff3cd',
    borderLeftWidth: 4,
    borderLeftColor: '#e67e22',
    padding: 16,
    margin: 16,
    borderRadius: 8,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 12,
    lineHeight: 20,
  },
  warningButton: {
    backgroundColor: '#e67e22',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  warningButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
