import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/constants/app_colors.dart';
import '../../auth/logic/auth_bloc.dart';
import '../../auth/logic/auth_state.dart';
import '../../dashboard/logic/dashboard_bloc.dart';
import '../../dashboard/logic/dashboard_event.dart';
import '../logic/cards_bloc.dart';
import '../logic/cards_event.dart';
import '../logic/cards_state.dart';

class CardsScreen extends StatefulWidget {
  const CardsScreen({super.key});

  @override
  State<CardsScreen> createState() => _CardsScreenState();
}

class _CardsScreenState extends State<CardsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    context.read<CardsBloc>().add(const FetchCardsStock());
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Color _getOperatorColor(String operator) {
    switch (operator.toLowerCase()) {
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

  void _showBuyDialog(Map<String, dynamic> item) {
    final qtyController = TextEditingController(text: '1');
    final op = item['operator'] ?? 'mobilis';
    final double value = double.tryParse(item['value'].toString()) ?? 0.0;
    final int available = item['available_count'] != null 
        ? int.parse(item['available_count'].toString()) 
        : 0;

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.bgSecondary,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: AppColors.border),
        ),
        title: const Text('شراء حزم بطاقات', style: TextStyle(fontWeight: FontWeight.bold)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('الشركة: ${op.toUpperCase()}', style: TextStyle(color: _getOperatorColor(op), fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text('فئة البطاقة: $value د.ج', style: const TextStyle(color: AppColors.textPrimary)),
            Text('الكمية المتاحة بالمتجر: $available', style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
            const SizedBox(height: 16),
            TextFormField(
              controller: qtyController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'الكمية المطلوبة لشراءها',
                hintText: 'مثال: 5',
              ),
              style: const TextStyle(color: AppColors.textPrimary),
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
              final qty = int.tryParse(qtyController.text) ?? 0;
              if (qty <= 0 || qty > available) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('الكمية المدخلة غير متوفرة'), backgroundColor: AppColors.danger),
                );
                return;
              }
              Navigator.pop(context);
              context.read<CardsBloc>().add(
                    BuyCardsRequested(
                      operator: op,
                      value: value,
                      quantity: qty,
                    ),
                  );
            },
            style: ElevatedButton.styleFrom(backgroundColor: _getOperatorColor(op)),
            child: const Text('شراء ودفع'),
          ),
        ],
      ),
    );
  }

  void _showSellDialog(String operator, double value) {
    final clientController = TextEditingController();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.bgSecondary,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: AppColors.border),
        ),
        title: const Text('بيع بطاقة تفعيل', style: TextStyle(fontWeight: FontWeight.bold)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('الشركة: ${operator.toUpperCase()}', style: TextStyle(color: _getOperatorColor(operator), fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text('الفئة: $value د.ج', style: const TextStyle(color: AppColors.textPrimary)),
            const SizedBox(height: 16),
            TextFormField(
              controller: clientController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'رقم معرف العميل المشتري (اختياري)',
                hintText: 'رقم المعرف الرقمي للعميل',
              ),
              style: const TextStyle(color: AppColors.textPrimary),
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
              final clientId = clientController.text.trim();
              Navigator.pop(context);
              context.read<CardsBloc>().add(
                    SellCardRequested(
                      operator: operator,
                      value: value,
                      clientId: clientId.isEmpty ? null : clientId,
                    ),
                  );
            },
            style: ElevatedButton.styleFrom(backgroundColor: _getOperatorColor(operator)),
            child: const Text('تأكيد البيع'),
          ),
        ],
      ),
    );
  }

  Widget _buildMyStockTab(List<dynamic> cards, List<dynamic> summary) {
    if (cards.isEmpty) {
      return const Center(
        child: Text(
          'لا توجد بطاقات في مخزونك الحالي\nيمكنك شراء بطاقات جديدة من المتجر',
          textAlign: TextAlign.center,
          style: TextStyle(color: AppColors.textMuted),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: summary.length,
      itemBuilder: (context, index) {
        final item = summary[index];
        final op = item['operator'] ?? 'mobilis';
        final status = item['status'] ?? 'available';
        final count = item['count'] ?? 0;
        final totalVal = item['total_value'] ?? '0';

        if (status != 'available') return const SizedBox.shrink();

        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: ExpansionTile(
            leading: Icon(Icons.credit_card, color: _getOperatorColor(op)),
            title: Text(
              'بطاقات ${op.toUpperCase()}',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
            ),
            subtitle: Text(
              'الكمية: $count بطاقة • القيمة الإجمالية: $totalVal د.ج',
              style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
            ),
            children: cards
                .where((c) => c['operator'] == op && c['status'] == 'available')
                .map((card) {
              final double value = double.tryParse(card['value'].toString()) ?? 0.0;
              return ListTile(
                title: Text(
                  'رقم تسلسلي: ${card['serial'] ?? 'N/A'}',
                  style: const TextStyle(fontSize: 12, color: AppColors.textPrimary, letterSpacing: 0.5),
                ),
                subtitle: Text(
                  'فئة: $value د.ج • PIN: ${card['pin'] ?? '****'}',
                  style: const TextStyle(fontSize: 10, color: AppColors.textMuted),
                ),
                trailing: ElevatedButton(
                  onPressed: () => _showSellDialog(op, value),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _getOperatorColor(op),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  ),
                  child: const Text('بيع', style: TextStyle(fontSize: 11)),
                ),
              );
            }).toList(),
          ),
        );
      },
    );
  }

  Widget _buildStoreTab(List<dynamic> storeSummary) {
    if (storeSummary.isEmpty) {
      return const Center(
        child: Text(
          'لا توجد حزم معروضة للبيع حالياً بالمتجر المشترك',
          textAlign: TextAlign.center,
          style: TextStyle(color: AppColors.textMuted),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: storeSummary.length,
      itemBuilder: (context, index) {
        final item = storeSummary[index];
        final op = item['operator'] ?? 'mobilis';
        final double value = double.tryParse(item['value'].toString()) ?? 0.0;
        final int available = item['available_count'] != null 
            ? int.parse(item['available_count'].toString()) 
            : 0;

        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: ListTile(
            leading: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: _getOperatorColor(op).withOpacity(0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(Icons.shopping_bag_outlined, color: _getOperatorColor(op), size: 20),
            ),
            title: Text(
              '${op.toUpperCase()} - $value د.ج',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
            ),
            subtitle: Text(
              'البطاقات المتاحة بالمتجر: $available',
              style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
            ),
            trailing: ElevatedButton(
              onPressed: () => _showBuyDialog(item),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.accent,
                padding: const EdgeInsets.symmetric(horizontal: 16),
              ),
              child: const Text('شراء', style: TextStyle(fontSize: 12)),
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('إدارة وبيع البطاقات'),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppColors.accent,
          tabs: const [
            Tab(text: 'مخزوني الحالي'),
            Tab(text: 'شراء بطاقات جديدة'),
          ],
        ),
      ),
      body: BlocListener<CardsBloc, CardsState>(
        listener: (context, state) {
          if (state is CardsActionSuccess) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.message), backgroundColor: AppColors.success),
            );
            // Refresh stocks and wallet info
            context.read<CardsBloc>().add(const FetchCardsStock());
            context.read<DashboardBloc>().add(FetchDashboardData());
          } else if (state is CardsActionFailure) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.error), backgroundColor: AppColors.danger),
            );
          }
        },
        child: BlocBuilder<CardsBloc, CardsState>(
          builder: (context, state) {
            if (state is CardsLoading) {
              return const Center(child: CircularProgressIndicator(color: AppColors.accent));
            }

            if (state is CardsError) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.error_outline, color: AppColors.danger, size: 48),
                    const SizedBox(height: 16),
                    Text(state.error, style: const TextStyle(color: AppColors.textSecondary)),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: () => context.read<CardsBloc>().add(const FetchCardsStock()),
                      child: const Text('تحديث الصفحة'),
                    ),
                  ],
                ),
              );
            }

            final List<dynamic> cards = state is CardsLoaded ? state.cards : [];
            final List<dynamic> summary = state is CardsLoaded ? state.summary : [];
            final List<dynamic> storeSummary = state is CardsLoaded ? state.storeSummary : [];

            return TabBarView(
              controller: _tabController,
              children: [
                _buildMyStockTab(cards, summary),
                _buildStoreTab(storeSummary),
              ],
            );
          },
        ),
      ),
    );
  }
}
