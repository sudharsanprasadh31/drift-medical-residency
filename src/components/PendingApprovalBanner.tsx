import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function PendingApprovalBanner() {
  return (
    <View style={styles.banner}>
      <Text style={styles.icon}>⏳</Text>
      <View style={styles.textContainer}>
        <Text style={styles.title}>Pending Approval</Text>
        <Text style={styles.subtitle}>
          Your profile is being reviewed. You'll be notified once approved.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#fff3cd',
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 32,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#856404',
  },
});
