import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/storage/secure_storage.dart';
import '../../auth/logic/auth_bloc.dart';
import '../../auth/logic/auth_event.dart';
import '../../auth/logic/auth_state.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  String _currentLanguage = 'ar';

  @override
  void initState() {
    super.initState();
    _loadLanguage();
  }

  void _loadLanguage() async {
    final lang = await SecureStorage.getLanguage();
    setState(() {
      _currentLanguage = lang;
    });
  }

  void _toggleLanguage() async {
    final nextLang = _currentLanguage == 'ar' ? 'fr' : 'ar';
    await SecureStorage.saveLanguage(nextLang);
    setState(() {
      _currentLanguage = nextLang;
    });
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(nextLang == 'ar' ? 'تم تحويل لغة التطبيق إلى العربية' : 'Langue modifiée en Français'),
          backgroundColor: AppColors.success,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<AuthBloc, AuthState>(
      builder: (context, state) {
        if (state is! Authenticated) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }

        final user = state.user;
        final String name = user['full_name'] ?? user['username'] ?? 'مستخدم';
        final String username = user['username'] ?? '';
        final String email = user['email'] ?? '';
        final String role = user['role'] ?? 'CLIENT';
        final double wallet = user['wallet'] != null ? double.parse(user['wallet'].toString()) : 0.0;
        final double debt = user['debt'] != null ? double.parse(user['debt'].toString()) : 0.0;

        List<String> permissions = [];
        try {
          if (user['permissions'] != null) {
            final dynamic rawPerms = user['permissions'];
            if (rawPerms is List) {
              permissions = List<String>.from(rawPerms);
            } else if (rawPerms is String) {
              permissions = List<String>.from(rawPerms.replaceAll('[', '').replaceAll(']', '').replaceAll('"', '').split(','));
            }
          }
        } catch (_) {}

        return Scaffold(
          appBar: AppBar(
            title: const Text('الإعدادات والملف الشخصي'),
          ),
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // User info card
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(20.0),
                    child: Column(
                      children: [
                        CircleAvatar(
                          radius: 36,
                          backgroundColor: AppColors.accent.withOpacity(0.15),
                          child: Text(
                            name.isNotEmpty ? name[0].toUpperCase() : 'U',
                            style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: AppColors.accent),
                          ),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          name,
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                        ),
                        Text(
                          '@$username • $email',
                          style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                        ),
                        const SizedBox(height: 12),
                        Chip(
                          label: Text(
                            role,
                            style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                          backgroundColor: AppColors.accent,
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 20),

                // Financial details
                const Text(
                  'التفاصيل المالية والديون',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.textSecondary),
                ),
                const SizedBox(height: 8),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('الرصيد المتاح:', style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                            Text('$wallet د.ج', style: const TextStyle(color: AppColors.success, fontWeight: FontWeight.bold)),
                          ],
                        ),
                        const Divider(color: AppColors.border, height: 24),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('سقف الديون الحالي:', style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                            Text('$debt د.ج', style: TextStyle(color: debt > 0 ? AppColors.danger : AppColors.textPrimary, fontWeight: FontWeight.bold)),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 20),

                // System Permissions
                if (permissions.isNotEmpty) ...[
                  const Text(
                    'صلاحيات وتراخيص النظام الممنوحة',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.textSecondary),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8.0,
                    runSpacing: 8.0,
                    children: permissions.map((perm) {
                      return Chip(
                        label: Text(
                          perm.toUpperCase(),
                          style: const TextStyle(fontSize: 10, color: AppColors.textPrimary),
                        ),
                        backgroundColor: AppColors.bgCard,
                        side: const BorderSide(color: AppColors.border),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 20),
                ],

                // App settings actions
                const Text(
                  'إعدادات التطبيق العامة',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.textSecondary),
                ),
                const SizedBox(height: 8),
                Card(
                  child: Column(
                    children: [
                      ListTile(
                        leading: const Icon(Icons.language, color: AppColors.accent),
                        title: const Text('لغة التطبيق (Language)', style: TextStyle(fontSize: 13)),
                        trailing: Text(
                          _currentLanguage == 'ar' ? 'العربية' : 'Français',
                          style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                        ),
                        onTap: _toggleLanguage,
                      ),
                      const Divider(color: AppColors.border, height: 1),
                      ListTile(
                        leading: const Icon(Icons.info_outline, color: AppColors.accent),
                        title: const Text('إصدار التطبيق', style: TextStyle(fontSize: 13)),
                        trailing: const Text(
                          'v1.0.0 (بيتا)',
                          style: TextStyle(color: AppColors.textSecondary, fontSize: 12),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 32),

                // Logout
                ElevatedButton(
                  onPressed: () {
                    context.read<AuthBloc>().add(LogoutRequested());
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.danger,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.logout, size: 20),
                      SizedBox(width: 10),
                      Text('تسجيل الخروج من الحساب', style: TextStyle(fontSize: 14)),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
