import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/constants/app_colors.dart';
import '../../dashboard/logic/dashboard_bloc.dart';
import '../../dashboard/logic/dashboard_event.dart';
import '../logic/flexy_bloc.dart';
import '../logic/flexy_event.dart';
import '../logic/flexy_state.dart';

class FlexyScreen extends StatefulWidget {
  const FlexyScreen({super.key});

  @override
  State<FlexyScreen> createState() => _FlexyScreenState();
}

class _FlexyScreenState extends State<FlexyScreen> {
  final _formKey = GlobalKey<FormState>();
  final _numberController = TextEditingController();
  final _amountController = TextEditingController();
  
  String _selectedOperator = 'mobilis'; // mobilis, djezzy, ooredoo
  final List<double> _quickAmounts = [100, 200, 500, 1000, 2000];

  @override
  void initState() {
    super.initState();
    _numberController.addListener(_autoDetectOperator);
  }

  @override
  void dispose() {
    _numberController.removeListener(_autoDetectOperator);
    _numberController.dispose();
    _amountController.dispose();
    super.dispose();
  }

  // Algerian phone prefix detection: Mobilis (06), Djezzy (07), Ooredoo (05)
  void _autoDetectOperator() {
    final text = _numberController.text.trim();
    if (text.length >= 2) {
      final prefix = text.substring(0, 2);
      if (prefix == '06') {
        _setOperator('mobilis');
      } else if (prefix == '07') {
        _setOperator('djezzy');
      } else if (prefix == '05') {
        _setOperator('ooredoo');
      }
    }
  }

  void _setOperator(String op) {
    if (_selectedOperator != op) {
      setState(() {
        _selectedOperator = op;
      });
    }
  }

  Color _getOperatorThemeColor() {
    switch (_selectedOperator) {
      case 'mobilis':
        return AppColors.mobilis;
      case 'djezzy':
        return AppColors.djezzy;
      case 'ooredoo':
        return AppColors.ooredoo;
      default:
        return AppColors.accent;
    }
  }

  Widget _buildOperatorSelector(String op, String label, Color color) {
    final isSelected = _selectedOperator == op;
    return Expanded(
      child: GestureDetector(
        onTap: () => _setOperator(op),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: isSelected ? color.withOpacity(0.15) : AppColors.bgInput,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: isSelected ? color : AppColors.border,
              width: isSelected ? 1.5 : 1,
            ),
          ),
          alignment: Alignment.center,
          child: Text(
            label,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.bold,
              color: isSelected ? color : AppColors.textSecondary,
            ),
          ),
        ),
      ),
    );
  }

  void _confirmAndSend() {
    if (!_formKey.currentState!.validate()) return;

    final number = _numberController.text.trim();
    final amount = double.tryParse(_amountController.text) ?? 0.0;
    final operatorColor = _getOperatorThemeColor();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.bgSecondary,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: AppColors.border),
        ),
        title: const Text(
          'تأكيد إرسال الشحن',
          textAlign: TextAlign.center,
          style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.bold),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'يرجى التحقق من صحة الرقم ومبلغ الشحن قبل التأكيد:',
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
                      const Text('المتعامل:', style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
                      Text(
                        _selectedOperator.toUpperCase(),
                        style: TextStyle(color: operatorColor, fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                    ],
                  ),
                  const Divider(color: AppColors.border, height: 20),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('رقم الهاتف:', style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
                      Text(
                        number,
                        style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                    ],
                  ),
                  const Divider(color: AppColors.border, height: 20),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('المبلغ:', style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
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
              context.read<FlexyBloc>().add(
                    SendFlexyRequested(
                      operator: _selectedOperator,
                      number: number,
                      amount: amount,
                    ),
                  );
            },
            style: ElevatedButton.styleFrom(backgroundColor: operatorColor),
            child: const Text('تأكيد الإرسال'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final themeColor = _getOperatorThemeColor();

    return Scaffold(
      appBar: AppBar(
        title: const Text('شحن فليكسي (Flexy)'),
      ),
      body: BlocListener<FlexyBloc, FlexyState>(
        listener: (context, state) {
          if (state is FlexySuccess) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('تمت عملية الشحن بنجاح!'),
                backgroundColor: AppColors.success,
              ),
            );
            _numberController.clear();
            _amountController.clear();
            
            // Refresh dashboard wallet balance
            context.read<DashboardBloc>().add(FetchDashboardData());
          } else if (state is FlexyFailure) {
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
                // Operator Segment Tabs
                const Text(
                  'اختر متعامل الهاتف',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    _buildOperatorSelector('mobilis', 'Mobilis', AppColors.mobilis),
                    const SizedBox(width: 8),
                    _buildOperatorSelector('djezzy', 'Djezzy', AppColors.djezzy),
                    const SizedBox(width: 8),
                    _buildOperatorSelector('ooredoo', 'Ooredoo', AppColors.ooredoo),
                  ],
                ),
                const SizedBox(height: 24),

                // Phone number
                const Text(
                  'رقم الهاتف الجوال',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _numberController,
                  keyboardType: TextInputType.phone,
                  style: const TextStyle(color: AppColors.textPrimary, letterSpacing: 1),
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'يرجى إدخال رقم الهاتف';
                    }
                    if (value.trim().length != 10) {
                      return 'يجب أن يتكون الرقم من 10 أرقام';
                    }
                    return null;
                  },
                  decoration: InputDecoration(
                    hintText: 'مثال: 06XXXXXXXX',
                    prefixIcon: Icon(Icons.phone_iphone, color: themeColor),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: BorderSide(color: themeColor, width: 1.5),
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                // Amount
                const Text(
                  'مبلغ الشحن (د.ج)',
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
                      return 'يرجى إدخال مبلغ الشحن';
                    }
                    final amt = double.tryParse(value);
                    if (amt == null || amt <= 0) {
                      return 'يرجى إدخال مبلغ صالح أكبر من الصفر';
                    }
                    return null;
                  },
                  decoration: InputDecoration(
                    hintText: 'أدخل قيمة الشحن بالدينار',
                    prefixIcon: Icon(Icons.monetization_on_outlined, color: themeColor),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: BorderSide(color: themeColor, width: 1.5),
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // Quick Amounts row
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

                // Submit button
                BlocBuilder<FlexyBloc, FlexyState>(
                  builder: (context, state) {
                    final isSubmitting = state is FlexySubmitting;
                    return ElevatedButton(
                      onPressed: isSubmitting ? null : _confirmAndSend,
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
                              'إرسال رصيد شحن',
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
