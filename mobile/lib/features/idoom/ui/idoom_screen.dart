import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/constants/app_colors.dart';
import '../../dashboard/logic/dashboard_bloc.dart';
import '../../dashboard/logic/dashboard_event.dart';
import '../logic/idoom_bloc.dart';
import '../logic/idoom_event.dart';
import '../logic/idoom_state.dart';

class IdoomScreen extends StatefulWidget {
  const IdoomScreen({super.key});

  @override
  State<IdoomScreen> createState() => _IdoomScreenState();
}

class _IdoomScreenState extends State<IdoomScreen> {
  final _formKey = GlobalKey<FormState>();
  final _ssuidController = TextEditingController();
  final _amountController = TextEditingController();

  String _selectedType = 'adsl'; // adsl, fibre, lte
  final List<double> _quickAmounts = [500, 1000, 1600, 2000, 3000, 5000];

  Color _getTypeColor(String type) {
    switch (type.toLowerCase()) {
      case 'adsl':
        return const Color(0xFF0EA5E9);
      case 'fibre':
        return const Color(0xFF6366F1);
      case 'lte':
        return const Color(0xFFF59E0B);
      default:
        return AppColors.accent;
    }
  }

  Widget _buildTypeSelector(String type, String label, IconData icon) {
    final isSelected = _selectedType == type;
    final color = _getTypeColor(type);
    return Expanded(
      child: GestureDetector(
        onTap: () {
          setState(() {
            _selectedType = type;
          });
        },
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(vertical: 14),
          decoration: BoxDecoration(
            color: isSelected ? color.withOpacity(0.12) : AppColors.bgInput,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: isSelected ? color : AppColors.border,
              width: isSelected ? 1.5 : 1,
            ),
          ),
          child: Column(
            children: [
              Icon(icon, color: isSelected ? color : AppColors.textSecondary, size: 20),
              const SizedBox(height: 6),
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: isSelected ? color : AppColors.textSecondary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _submitRecharge() {
    if (!_formKey.currentState!.validate()) return;

    final ssuid = _ssuidController.text.trim();
    final amount = double.tryParse(_amountController.text) ?? 0.0;
    final typeColor = _getTypeColor(_selectedType);

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.bgSecondary,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: AppColors.border),
        ),
        title: const Text(
          'تأكيد الشحن الرقمي',
          textAlign: TextAlign.center,
          style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.bold),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'يرجى التأكد من كتابة معرف الخدمة/رقم الهاتف بشكل صحيح:',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
            ),
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.bgCard,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('نوع الخدمة:', style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
                      Text(
                        _selectedType.toUpperCase(),
                        style: TextStyle(color: typeColor, fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                    ],
                  ),
                  const Divider(color: AppColors.border, height: 20),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('رقم المعرّف (SSUID):', style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
                      Text(
                        ssuid,
                        style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                    ],
                  ),
                  const Divider(color: AppColors.border, height: 20),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('القيمة المالية:', style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
                      Text(
                        '$amount د.ج',
                        style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          OutlinedButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('إلغاء'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              context.read<IdoomBloc>().add(
                    RechargeIdoomRequested(
                      ssuid: ssuid,
                      amount: amount,
                      type: _selectedType,
                    ),
                  );
            },
            style: ElevatedButton.styleFrom(backgroundColor: typeColor),
            child: const Text('شحن وتفعيل'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final themeColor = _getTypeColor(_selectedType);

    return Scaffold(
      appBar: AppBar(
        title: const Text('شحن وتعبئة أيدوم (Idoom)'),
      ),
      body: BlocListener<IdoomBloc, IdoomState>(
        listener: (context, state) {
          if (state is IdoomSuccess) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('تم شحن حساب أيدوم بنجاح!'),
                backgroundColor: AppColors.success,
              ),
            );
            _ssuidController.clear();
            _amountController.clear();
            
            // Refresh balance
            context.read<DashboardBloc>().add(FetchDashboardData());
          } else if (state is IdoomFailure) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.error),
                backgroundColor: AppColors.danger,
              ),
            );
          }
        },
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16.0),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Network Type Selector
                const Text(
                  'نوع اشتراك أيدوم',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    _buildTypeSelector('adsl', 'ADSL', Icons.router_outlined),
                    const SizedBox(width: 8),
                    _buildTypeSelector('fibre', 'Fibre', Icons.speed),
                    const SizedBox(width: 8),
                    _buildTypeSelector('lte', '4G LTE', Icons.signal_cellular_alt),
                  ],
                ),
                const SizedBox(height: 24),

                // SSUID Input
                const Text(
                  'رقم الهاتف الثابت أو المعرّف (SSUID)',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _ssuidController,
                  keyboardType: TextInputType.text,
                  style: const TextStyle(color: AppColors.textPrimary, letterSpacing: 1),
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'يرجى إدخال رقم المعرّف الخاص بالخدمة';
                    }
                    if (value.trim().length < 6) {
                      return 'يرجى إدخال معرّف صالح';
                    }
                    return null;
                  },
                  decoration: InputDecoration(
                    hintText: 'أدخل رقم الهاتف الثابت أو معرف 4G',
                    prefixIcon: Icon(Icons.perm_identity, color: themeColor),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: BorderSide(color: themeColor, width: 1.5),
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                // Amount
                const Text(
                  'قيمة الشحن المطلوبة (د.ج)',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _amountController,
                  keyboardType: TextInputType.number,
                  style: const TextStyle(color: AppColors.textPrimary),
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'يرجى إدخال قيمة التعبئة';
                    }
                    final amt = double.tryParse(value);
                    if (amt == null || amt <= 0) {
                      return 'يرجى إدخال قيمة صالحة';
                    }
                    return null;
                  },
                  decoration: InputDecoration(
                    hintText: 'قيمة بطاقة الشحن أو رصيد التجديد',
                    prefixIcon: Icon(Icons.payments_outlined, color: themeColor),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: BorderSide(color: themeColor, width: 1.5),
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // Quick Amounts
                Wrap(
                  spacing: 8.0,
                  runSpacing: 8.0,
                  children: _quickAmounts.map((amt) {
                    return ActionChip(
                      label: Text('${amt.toInt()} د.ج'),
                      labelStyle: const TextStyle(color: AppColors.textPrimary, fontSize: 11),
                      backgroundColor: AppColors.bgCard,
                      side: const BorderSide(color: AppColors.border),
                      onPressed: () {
                        setState(() {
                          _amountController.text = amt.toInt().toString();
                        });
                      },
                    );
                  }).toList(),
                ),
                const SizedBox(height: 40),

                // Recharge Button
                BlocBuilder<IdoomBloc, IdoomState>(
                  builder: (context, state) {
                    final isSubmitting = state is IdoomSubmitting;
                    return ElevatedButton(
                      onPressed: isSubmitting ? null : _submitRecharge,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: themeColor,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                      child: isSubmitting
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                              ),
                            )
                          : const Text(
                              'تفعيل الاشتراك الآن',
                              style: TextStyle(fontSize: 15),
                            ),
                    );
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
