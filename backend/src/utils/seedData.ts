import { User, HistoryEntry } from '../models';
import { logger } from '../config/logger';

export class SeedDataUtils {
  /**
   * Create sample users for development
   */
  static async createSampleUsers(): Promise<void> {
    try {
      const sampleUsers = [
        {
          email: 'john.doe@example.com',
          password: 'Password123!',
          firstName: 'John',
          lastName: 'Doe',
          role: 'user' as const,
          isActive: true,
          isEmailVerified: true
        },
        {
          email: 'jane.smith@example.com',
          password: 'Password123!',
          firstName: 'Jane',
          lastName: 'Smith',
          role: 'user' as const,
          isActive: true,
          isEmailVerified: true
        },
        {
          email: 'security.analyst@example.com',
          password: 'Password123!',
          firstName: 'Security',
          lastName: 'Analyst',
          role: 'user' as const,
          isActive: true,
          isEmailVerified: true
        }
      ];

      for (const userData of sampleUsers) {
        const existingUser = await User.findOne({ email: userData.email });
        if (!existingUser) {
          const user = new User(userData);
          await user.save();
          logger.info(`Created sample user: ${userData.email}`);
        }
      }
    } catch (error) {
      logger.error('Error creating sample users:', error);
    }
  }

  /**
   * Create sample log analyses for development
   */
  static async createSampleAnalyses(): Promise<void> {
    try {
      const users = await User.find({ role: 'user' }).limit(3);
      if (users.length === 0) return;

      const sampleLogs = [
        {
          title: 'Apache Access Log Analysis',
          logContent: `192.168.1.100 - - [06/Sep/2024:10:30:15 +0000] "GET /admin HTTP/1.1" 401 1234
192.168.1.101 - - [06/Sep/2024:10:30:16 +0000] "POST /login HTTP/1.1" 200 567
192.168.1.102 - - [06/Sep/2024:10:30:17 +0000] "GET /dashboard HTTP/1.1" 200 2345
192.168.1.100 - - [06/Sep/2024:10:30:18 +0000] "GET /admin HTTP/1.1" 401 1234
192.168.1.100 - - [06/Sep/2024:10:30:19 +0000] "POST /admin/login HTTP/1.1" 401 890`,
          analysis: {
            summary: 'Analysis of Apache access logs reveals multiple failed authentication attempts from IP 192.168.1.100, indicating potential brute force attack.',
            securityThreats: [
              {
                severity: 'High' as const,
                description: 'Multiple failed authentication attempts detected from IP 192.168.1.100',
                recommendation: 'Block IP address and investigate further',
                timestamp: '2024-09-06T10:30:15Z',
                category: 'Brute Force Attack',
                riskScore: 85
              }
            ],
            operationalIssues: [
              {
                type: 'Warning' as const,
                description: 'High number of 401 responses indicating authentication issues',
                recommendation: 'Review authentication system performance',
                timestamp: '2024-09-06T10:30:15Z',
                category: 'Authentication',
                impact: 'May affect user experience'
              }
            ],
            totalThreats: 1,
            totalIssues: 1,
            overallRiskLevel: 'High' as const
          },
          tags: ['apache', 'web-server', 'authentication', 'security'],
          isPublic: true
        },
        {
          title: 'System Error Log Review',
          logContent: `2024-09-06 10:45:23 ERROR DatabaseConnection: Connection timeout after 30 seconds
2024-09-06 10:45:24 WARN MemoryManager: High memory usage detected (85%)
2024-09-06 10:45:25 INFO ServiceMonitor: Service restart initiated
2024-09-06 10:45:26 ERROR FileSystem: Disk space critical (95% full)
2024-09-06 10:45:27 FATAL SystemCore: Critical system failure detected`,
          analysis: {
            summary: 'System logs show critical infrastructure issues including database timeouts, high memory usage, and disk space problems.',
            securityThreats: [],
            operationalIssues: [
              {
                type: 'Error' as const,
                description: 'Database connection timeout indicating connectivity issues',
                recommendation: 'Check database server status and network connectivity',
                timestamp: '2024-09-06T10:45:23Z',
                category: 'Database',
                impact: 'Service unavailability'
              },
              {
                type: 'Error' as const,
                description: 'Critical disk space shortage (95% full)',
                recommendation: 'Immediate disk cleanup and capacity expansion required',
                timestamp: '2024-09-06T10:45:26Z',
                category: 'Storage',
                impact: 'System instability'
              }
            ],
            totalThreats: 0,
            totalIssues: 2,
            overallRiskLevel: 'Critical' as const
          },
          tags: ['system', 'infrastructure', 'database', 'storage'],
          isPublic: false
        },
        {
          title: 'Network Security Log',
          logContent: `2024-09-06 11:00:01 INFO Firewall: Connection established from 203.0.113.45
2024-09-06 11:00:02 WARN IDS: Suspicious packet pattern detected from 203.0.113.45
2024-09-06 11:00:03 ALERT IDS: Potential SQL injection attempt blocked
2024-09-06 11:00:04 INFO Firewall: Connection blocked from 203.0.113.45
2024-09-06 11:00:05 INFO SecurityMonitor: Threat level elevated to HIGH`,
          analysis: {
            summary: 'Network security logs indicate successful detection and blocking of SQL injection attack attempt.',
            securityThreats: [
              {
                severity: 'Critical' as const,
                description: 'SQL injection attack attempt detected and blocked',
                recommendation: 'Investigate source IP and review application security',
                timestamp: '2024-09-06T11:00:03Z',
                category: 'SQL Injection',
                riskScore: 95
              }
            ],
            operationalIssues: [
              {
                type: 'Info' as const,
                description: 'Security systems functioning correctly, threat blocked',
                recommendation: 'Continue monitoring for additional attempts',
                timestamp: '2024-09-06T11:00:04Z',
                category: 'Security Response',
                impact: 'No impact - threat mitigated'
              }
            ],
            totalThreats: 1,
            totalIssues: 1,
            overallRiskLevel: 'Medium' as const
          },
          tags: ['network', 'security', 'firewall', 'sql-injection'],
          isPublic: true
        }
      ];

      for (let i = 0; i < sampleLogs.length && i < users.length; i++) {
        const logData = sampleLogs[i];
        const user = users[i];

        const existingAnalysis = await HistoryEntry.findOne({ 
          userId: user._id, 
          title: logData.title 
        });

        if (!existingAnalysis) {
          const historyEntry = new HistoryEntry({
            userId: user._id,
            ...logData
          });

          await historyEntry.save();
          logger.info(`Created sample analysis: ${logData.title} for user ${user.email}`);
        }
      }
    } catch (error) {
      logger.error('Error creating sample analyses:', error);
    }
  }

  /**
   * Seed all development data
   */
  static async seedAll(): Promise<void> {
    logger.info('Starting data seeding...');
    await this.createSampleUsers();
    await this.createSampleAnalyses();
    logger.info('Data seeding completed');
  }
}
