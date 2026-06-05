import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import '../../../../core/constants/app_colors.dart';
import '../../auth/logic/auth_bloc.dart';
import '../../auth/logic/auth_state.dart';
import '../logic/dashboard_bloc.dart';
import '../logic/dashboard_event.dart';
import '../logic/dashboard_state.dart';

class HomeScreen extends StatefulWidget {
  final Function(int) onNavigate;

  const HomeScreen({super.key, required this.onNavigate});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _currencyFormatter = NumberFormat.currency(locale: 'fr_DZ', symbol: 'DA');

  @override
  void initState() {
    super.initState();
    context.read<DashboardBloc>().add(FetchDashboardData());
  }

  Color _getOperatorColor(String operator) {
    switch (operator.toLowerCase()) {
      case 'mobilis':
        return AppColors.mobilis;
      case 'djezzy':
        return AppColors.djezzy;
      case 'ooredoo':
        return AppColors.ooredoo;
      case 'idoom':
        return AppColors.idoom;
      default:
        return AppColors.accent;
    }
  }

  Widget _buildStatCard({
    required String title,
    required String value,
    required IconData icon,
    required Color color,
  }) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.textSecondary,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 18,
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: color.withOpacity(0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: color, size: 22),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            context.read<DashboardBloc>().add(FetchDashboardData());
          },
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16.0),
            child: BlocBuilder<DashboardBloc, DashboardState>(
              builder: (context, state) {
                // Fetch current user from AuthBloc for localized greeting
                final authState = context.read<AuthBloc>().state;
                String username = 'مرحباً بك';
                String role = '';
                if (authState is Authenticated) {
                  username = authState.user['full_name'] ?? authState.user['username'] ?? 'مرحباً بك';
                  role = authState.user['role'] ?? '';
                }

                if (state is DashboardLoading) {
                  return const SizedBox(
                    height: 500,
                    child: Center(
                      child: CircularProgressIndicator(color: AppColors.accent),
                    ),
                  );
                }

                if (state is DashboardError) {
                  return SizedBox(
                    height: 500,
                    child: Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.error_outline, color: AppColors.danger, size: 48),
                          const SizedBox(height: 16),
                          Text(state.message, style: const TextStyle(color: AppColors.textSecondary)),
                          const SizedBox(height: 16),
                          ElevatedButton(
                            onPressed: () {
                              context.read<DashboardBloc>().add(FetchDashboardData());
                            },
                            child: const Text('إعادة المحاولة'),
                          ),
                        ],
                      ),
                    ),
                  );
                }

                final Map<String, dynamic> stats = state is DashboardLoaded ? state.stats : {};
                final List<dynamic> transactions = state is DashboardLoaded ? state.recentTransactions : [];

                final double walletBalance = stats['myWalletBalance'] != null 
                    ? double.parse(stats['myWalletBalance'].toString()) 
                    : 0.0;

                return Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Header greeting
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'أهلاً، $username',
                              style: const TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'صلاحيات الحساب: $role',
                              style: const TextStyle(
                                fontSize: 11,
                                color: AppColors.textMuted,
                              ),
                            ),
                          ],
                        ),
                        Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [AppColors.accent, Color(0xFFA78BFA)],
                            ),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            username.isNotEmpty ? username[0].toUpperCase() : 'U',
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                        )
                      ],
                    ),
                    const SizedBox(height: 24),

                    // Glassmorphic Wallet Balance Card
                    Container(
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [
                            AppColors.accent.withOpacity(0.85),
                            const Color(0xFF4F46E5).withOpacity(0.85),
                          ],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.accent.withOpacity(0.3),
                            blurRadius: 20,
                            offset: const Offset(0, 10),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'الرصيد الحالي بالمحفظة',
                                style: TextStyle(
                                  color: Colors.white70,
                                  fontSize: 13,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              Icon(Icons.account_balance_wallet, color: Colors.white, size: 20),
                            ],
                          ),
                          const SizedBox(height: 16),
                          Text(
                            _currencyFormatter.format(walletBalance),
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 28,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.5,
                            ),
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            'تحديث فوري للرصيد',
                            style: TextStyle(
                              color: Colors.white60,
                              fontSize: 10,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Quick Actions
                    const Text(
                      'الخدمات السريعة',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: InkWell(
                            onTap: () => widget.onNavigate(1), // Index of Flexy
                            child: Card(
                              child: Padding(
                                padding: const EdgeInsets.symmetric(vertical: 16.0),
                                child: Column(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(10),
                                      decoration: BoxDecoration(
                                        color: AppColors.success.withOpacity(0.12),
                                        shape: BoxShape.circle,
                                      ),
                                      child: const Icon(Icons.flash_on, color: AppColors.success, size: 24),
                                    ),
                                    const SizedBox(height: 8),
                                    const Text('فليكسي', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: InkWell(
                            onTap: () => widget.onNavigate(2), // Index of Idoom
                            child: Card(
                              child: Padding(
                                padding: const EdgeInsets.symmetric(vertical: 16.0),
                                child: Column(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(10),
                                      decoration: BoxDecoration(
                                        color: AppColors.idoom.withOpacity(0.12),
                                        shape: BoxShape.circle,
                                      ),
                                      child: const Icon(Icons.wifi, color: AppColors.idoom, size: 24),
                                    ),
                                    const SizedBox(height: 8),
                                    const Text('أيدوم ADSL', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: InkWell(
                            onTap: () => widget.onNavigate(3), // Index of Cards
                            child: Card(
                              child: Padding(
                                padding: const EdgeInsets.symmetric(vertical: 16.0),
                                child: Column(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(10),
                                      decoration: BoxDecoration(
                                        color: AppColors.warning.withOpacity(0.12),
                                        shape: BoxShape.circle,
                                      ),
                                      child: const Icon(Icons.credit_card, color: AppColors.warning, size: 24),
                                    ),
                                    const SizedBox(height: 8),
                                    const Text('البطاقات', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),

                    // Stats Grid
                    const Text(
                      'ملخص عمليات اليوم',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 12),
                    _buildStatCard(
                      title: 'أرباح اليوم المكتسبة',
                      value: _currencyFormatter.format(stats['todayEarnings'] ?? 0.0),
                      icon: Icons.trending_up,
                      color: AppColors.success,
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: _buildStatCard(
                            title: 'إجمالي العمليات',
                            value: (stats['totalTransactions'] ?? 0).toString(),
                            icon: Icons.swap_horiz,
                            color: AppColors.info,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _buildStatCard(
                            title: 'العمليات الفاشلة',
                            value: (stats['failedOperations'] ?? 0).toString(),
                            icon: Icons.cancel_outlined,
                            color: AppColors.danger,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),

                    // Recent Transactions
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'أحدث العمليات',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        TextButton(
                          onPressed: () {},
                          child: const Text(
                            'عرض الكل',
                            style: TextStyle(fontSize: 11, color: AppColors.accent),
                          ),
                        ),
                      ],
                    ),
                    if (transactions.isEmpty)
                      const Card(
                        child: Padding(
                          padding: EdgeInsets.all(24.0),
                          child: Text(
                            'لا توجد عمليات مسجلة اليوم',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: AppColors.textMuted, fontSize: 13),
                          ),
                        ),
                      )
                    else
                      ListView.separated(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: transactions.length,
                        separatorBuilder: (context, index) => const SizedBox(height: 8),
                        itemBuilder: (context, index) {
                          final tx = transactions[index];
                          final String op = tx['operator'] ?? 'Service';
                          final String type = tx['type'] ?? '';
                          final double amount = tx['amount'] != null ? double.parse(tx['amount'].toString()) : 0.0;
                          final String status = tx['status'] ?? 'unknown';
                          final String phone = tx['phone_number'] ?? '';
                          
                          IconData txIcon = Icons.flash_on;
                          if (type == 'idoom') txIcon = Icons.wifi;
                          if (type == 'card' || type == 'buy_cards') txIcon = Icons.credit_card;

                          Color statusColor = AppColors.textMuted;
                          String statusText = 'غير معروف';
                          if (status == 'success') {
                            statusColor = AppColors.success;
                            statusText = 'ناجحة';
                          } else if (status == 'processing') {
                            statusColor = AppColors.warning;
                            statusText = 'معالجة';
                          } else if (status == 'failed') {
                            statusColor = AppColors.danger;
                            statusText = 'فاشلة';
                          }

                          return Card(
                            child: ListTile(
                              leading: Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: _getOperatorColor(op).withOpacity(0.12),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Icon(
                                  txIcon,
                                  color: _getOperatorColor(op),
                                  size: 20,
                                ),
                              ),
                              title: Text(
                                phone.isNotEmpty ? phone : op.toUpperCase(),
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                              subtitle: Text(
                                '${tx['client_name'] ?? 'أنت'} • ${tx['created_at'] != null ? DateFormat('HH:mm').format(DateTime.parse(tx['created_at'])) : ''}',
                                style: const TextStyle(fontSize: 10, color: AppColors.textMuted),
                              ),
                              trailing: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Text(
                                    _currencyFormatter.format(amount),
                                    style: const TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.bold,
                                      color: AppColors.textPrimary,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: statusColor.withOpacity(0.12),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: Text(
                                      statusText,
                                      style: TextStyle(
                                        fontSize: 9,
                                        fontWeight: FontWeight.bold,
                                        color: statusColor,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                  ],
                );
              },
            ),
          ),
        ),
      ),
    );
  }
}
