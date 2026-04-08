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
import {
  getDutyHoursByWeek,
  getViolationsByResident,
  getAllViolations,
  check80HourViolation,
  getResidentScheduleStats,
} from '../services/scheduleApi';
import { ACGMEViolation, DutyHours } from '../types';

export default function ACGMEComplianceScreen({ navigation }: any) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [violations, setViolations] = useState<ACGMEViolation[]>([]);
  const [dutyHours, setDutyHours] = useState<DutyHours[]>([]);
  const [selectedWeekStart, setSelectedWeekStart] = useState(getMonday(new Date()));
  const [weeklyStats, setWeeklyStats] = useState({
    totalHours: 0,
    consecutiveHours: 0,
    daysOff: 0,
    isCompliant: true,
  });
  const [monthlyStats, setMonthlyStats] = useState({
    totalShifts: 0,
    callShifts: 0,
    totalHours: 0,
    averageHoursPerWeek: 0,
    violations: 0,
  });

  const isChiefOrAdmin = profile?.role === 'chief_resident' || profile?.role === 'admin';

  useEffect(() => {
    loadComplianceData();
  }, [profile, selectedWeekStart]);

  function getMonday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  const loadComplianceData = async () => {
    if (!profile?.id) return;

    try {
      const weekStartDate = selectedWeekStart.toISOString().split('T')[0];

      // Get current month stats
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      const [violationsData, dutyHoursData, violation80Hr, monthStats] = await Promise.all([
        isChiefOrAdmin ? getAllViolations(profile.program_id!) : getViolationsByResident(profile.id),
        getDutyHoursByWeek(profile.id, weekStartDate),
        check80HourViolation(profile.id, weekStartDate),
        getResidentScheduleStats(
          profile.id,
          startOfMonth.toISOString().split('T')[0],
          endOfMonth.toISOString().split('T')[0]
        ),
      ]);

      setViolations(violationsData);
      setDutyHours(dutyHoursData);
      setMonthlyStats(monthStats);

      // Calculate weekly stats
      const totalHours = dutyHoursData.reduce((sum, dh) => sum + dh.hours_worked, 0);
      const maxConsecutive = Math.max(...dutyHoursData.map((dh) => dh.consecutive_hours || 0), 0);
      const daysOff = 7 - dutyHoursData.length;

      setWeeklyStats({
        totalHours: totalHours,
        consecutiveHours: maxConsecutive,
        daysOff: daysOff,
        isCompliant: !violation80Hr.isViolation && maxConsecutive <= 28,
      });
    } catch (error: any) {
      console.error('Error loading compliance data:', error);
      Alert.alert('Error', 'Failed to load compliance data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadComplianceData();
    setRefreshing(false);
  };

  const changeWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedWeekStart);
    if (direction === 'prev') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() + 7);
    }
    setSelectedWeekStart(getMonday(newDate));
  };

  const formatWeekRange = () => {
    const start = selectedWeekStart;
    const end = new Date(start);
    end.setDate(end.getDate() + 6);

    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const getViolationColor = (severity: string | null) => {
    switch (severity) {
      case 'critical':
        return '#e74c3c';
      case 'major':
        return '#e67e22';
      case 'minor':
        return '#f39c12';
      default:
        return '#95a5a6';
    }
  };

  const getViolationIcon = (severity: string | null) => {
    switch (severity) {
      case 'critical':
        return '🚨';
      case 'major':
        return '⚠️';
      case 'minor':
        return '⚡';
      default:
        return '📋';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  const unresolvedViolations = violations.filter((v) => !v.resolved);

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Compliance Status Header */}
        <View
          style={[
            styles.statusHeader,
            {
              backgroundColor: weeklyStats.isCompliant ? '#27ae60' : '#e74c3c',
            },
          ]}
        >
          <Text style={styles.statusIcon}>
            {weeklyStats.isCompliant ? '✓' : '✗'}
          </Text>
          <View>
            <Text style={styles.statusTitle}>
              {weeklyStats.isCompliant ? 'ACGME Compliant' : 'Non-Compliant'}
            </Text>
            <Text style={styles.statusSubtitle}>
              {unresolvedViolations.length} active violation
              {unresolvedViolations.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {/* Week Selector */}
        <View style={styles.weekSelector}>
          <TouchableOpacity style={styles.weekButton} onPress={() => changeWeek('prev')}>
            <Text style={styles.weekButtonText}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={styles.weekTitle}>{formatWeekRange()}</Text>
          <TouchableOpacity style={styles.weekButton} onPress={() => changeWeek('next')}>
            <Text style={styles.weekButtonText}>{'>'}</Text>
          </TouchableOpacity>
        </View>

        {/* Weekly Stats */}
        <View style={styles.statsCard}>
          <Text style={styles.cardTitle}>This Week</Text>

          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text
                style={[
                  styles.statValue,
                  weeklyStats.totalHours > 80 ? styles.violationValue : styles.complianceValue,
                ]}
              >
                {Math.round(weeklyStats.totalHours)}
              </Text>
              <Text style={styles.statLabel}>Hours Worked</Text>
              <Text style={styles.statLimit}>Limit: 80/week</Text>
            </View>

            <View style={styles.statBox}>
              <Text
                style={[
                  styles.statValue,
                  weeklyStats.consecutiveHours > 28
                    ? styles.violationValue
                    : styles.complianceValue,
                ]}
              >
                {Math.round(weeklyStats.consecutiveHours)}
              </Text>
              <Text style={styles.statLabel}>Max Consecutive</Text>
              <Text style={styles.statLimit}>Limit: 28 hours</Text>
            </View>

            <View style={styles.statBox}>
              <Text
                style={[
                  styles.statValue,
                  weeklyStats.daysOff < 1 ? styles.violationValue : styles.complianceValue,
                ]}
              >
                {weeklyStats.daysOff}
              </Text>
              <Text style={styles.statLabel}>Days Off</Text>
              <Text style={styles.statLimit}>Required: 1/7 days</Text>
            </View>
          </View>
        </View>

        {/* Monthly Summary */}
        <View style={styles.statsCard}>
          <Text style={styles.cardTitle}>This Month Summary</Text>

          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{monthlyStats.totalShifts}</Text>
              <Text style={styles.summaryLabel}>Total Shifts</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{monthlyStats.callShifts}</Text>
              <Text style={styles.summaryLabel}>Call Shifts</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{Math.round(monthlyStats.totalHours)}</Text>
              <Text style={styles.summaryLabel}>Total Hours</Text>
            </View>
          </View>

          <View style={styles.avgHoursRow}>
            <Text style={styles.avgHoursLabel}>Average Hours per Week:</Text>
            <Text
              style={[
                styles.avgHoursValue,
                monthlyStats.averageHoursPerWeek > 80
                  ? styles.violationValue
                  : styles.complianceValue,
              ]}
            >
              {Math.round(monthlyStats.averageHoursPerWeek)} hours
            </Text>
          </View>
        </View>

        {/* Daily Duty Hours */}
        <View style={styles.dutyHoursCard}>
          <Text style={styles.cardTitle}>Daily Duty Hours</Text>

          {dutyHours.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No duty hours recorded this week</Text>
            </View>
          ) : (
            dutyHours.map((dh) => (
              <View key={dh.id} style={styles.dutyHourRow}>
                <View style={styles.dutyHourLeft}>
                  <Text style={styles.dutyHourDate}>
                    {new Date(dh.duty_date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                  {dh.is_call_day && <View style={styles.callBadge}>
                    <Text style={styles.callBadgeText}>Call</Text>
                  </View>}
                </View>
                <View style={styles.dutyHourRight}>
                  <Text
                    style={[
                      styles.dutyHourValue,
                      dh.hours_worked > 24 && styles.violationValue,
                    ]}
                  >
                    {dh.hours_worked.toFixed(1)} hrs
                  </Text>
                  {dh.consecutive_hours && dh.consecutive_hours > 24 && (
                    <Text style={styles.consecutiveText}>
                      {dh.consecutive_hours.toFixed(1)} consecutive
                    </Text>
                  )}
                </View>
              </View>
            ))
          )}
        </View>

        {/* Violations */}
        <View style={styles.violationsCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>
              Violations {unresolvedViolations.length > 0 && `(${unresolvedViolations.length})`}
            </Text>
          </View>

          {violations.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No violations recorded</Text>
              <Text style={styles.emptySubtext}>Keep up the great work!</Text>
            </View>
          ) : (
            violations.map((violation) => (
              <View
                key={violation.id}
                style={[
                  styles.violationCard,
                  {
                    borderLeftColor: getViolationColor(violation.severity),
                    opacity: violation.resolved ? 0.5 : 1,
                  },
                ]}
              >
                <View style={styles.violationHeader}>
                  <View style={styles.violationHeaderLeft}>
                    <Text style={styles.violationIcon}>
                      {getViolationIcon(violation.severity)}
                    </Text>
                    <View>
                      <Text style={styles.violationType}>{violation.violation_type}</Text>
                      <Text style={styles.violationDate}>
                        {new Date(violation.violation_date).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                  {violation.resolved && (
                    <View style={styles.resolvedBadge}>
                      <Text style={styles.resolvedText}>Resolved</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.violationDescription}>{violation.description}</Text>

                {violation.hours_worked && violation.max_allowed && (
                  <View style={styles.violationStats}>
                    <Text style={styles.violationStatsText}>
                      Worked: {violation.hours_worked} hours | Limit: {violation.max_allowed} hours
                    </Text>
                  </View>
                )}

                {violation.resolution_notes && (
                  <View style={styles.resolutionNotes}>
                    <Text style={styles.resolutionLabel}>Resolution:</Text>
                    <Text style={styles.resolutionText}>{violation.resolution_notes}</Text>
                  </View>
                )}
              </View>
            ))
          )}
        </View>

        {/* ACGME Guidelines Reference */}
        <View style={styles.guidelinesCard}>
          <Text style={styles.cardTitle}>ACGME VI.F Duty Hours</Text>

          <View style={styles.guidelineItem}>
            <Text style={styles.guidelineTitle}>Maximum Hours</Text>
            <Text style={styles.guidelineText}>
              80 hours per week (averaged over 4 weeks)
            </Text>
          </View>

          <View style={styles.guidelineItem}>
            <Text style={styles.guidelineTitle}>Continuous Duty</Text>
            <Text style={styles.guidelineText}>
              Maximum 24 hours + 4 hours for transitions (28 total)
            </Text>
          </View>

          <View style={styles.guidelineItem}>
            <Text style={styles.guidelineTitle}>Time Off</Text>
            <Text style={styles.guidelineText}>
              Minimum 14 hours after 24-hour call
              {'\n'}1 day off per week (1 in 7 days, averaged over 4 weeks)
            </Text>
          </View>

          <View style={styles.guidelineItem}>
            <Text style={styles.guidelineTitle}>Call Frequency</Text>
            <Text style={styles.guidelineText}>
              No more than every 3rd night (averaged over 4 weeks)
            </Text>
          </View>
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
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  statusIcon: {
    fontSize: 48,
    color: '#fff',
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  statusSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginTop: 4,
  },
  weekSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  weekButton: {
    padding: 8,
  },
  weekButtonText: {
    fontSize: 20,
    color: '#3498db',
    fontWeight: 'bold',
  },
  weekTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  statsCard: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  complianceValue: {
    color: '#27ae60',
  },
  violationValue: {
    color: '#e74c3c',
  },
  statLabel: {
    fontSize: 12,
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 4,
  },
  statLimit: {
    fontSize: 10,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#ecf0f1',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3498db',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4,
    textAlign: 'center',
  },
  avgHoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  avgHoursLabel: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '600',
  },
  avgHoursValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  dutyHoursCard: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 12,
  },
  dutyHourRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  dutyHourLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dutyHourDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  callBadge: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  callBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  dutyHourRight: {
    alignItems: 'flex-end',
  },
  dutyHourValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  consecutiveText: {
    fontSize: 11,
    color: '#7f8c8d',
    marginTop: 2,
  },
  violationsCard: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  violationCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  violationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  violationHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  violationIcon: {
    fontSize: 24,
  },
  violationType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    textTransform: 'capitalize',
  },
  violationDate: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 2,
  },
  resolvedBadge: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  resolvedText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  violationDescription: {
    fontSize: 14,
    color: '#2c3e50',
    marginBottom: 8,
    lineHeight: 20,
  },
  violationStats: {
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  violationStatsText: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  resolutionNotes: {
    backgroundColor: '#e8f5e9',
    padding: 12,
    borderRadius: 4,
  },
  resolutionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2e7d32',
    marginBottom: 4,
  },
  resolutionText: {
    fontSize: 13,
    color: '#2e7d32',
  },
  guidelinesCard: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 12,
    marginBottom: 20,
  },
  guidelineItem: {
    marginBottom: 16,
  },
  guidelineTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3498db',
    marginBottom: 4,
  },
  guidelineText: {
    fontSize: 13,
    color: '#2c3e50',
    lineHeight: 20,
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#95a5a6',
    marginTop: 4,
  },
});
