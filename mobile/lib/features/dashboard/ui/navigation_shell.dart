import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/constants/app_colors.dart';
import '../../auth/logic/auth_bloc.dart';
import '../../auth/logic/auth_state.dart';
import '../../cards/ui/cards_screen.dart';
import '../../flexy/ui/flexy_screen.dart';
import '../../idoom/ui/idoom_screen.dart';
import '../../settings/ui/settings_screen.dart';
import 'home_screen.dart';

class NavigationShell extends StatefulWidget {
  const NavigationShell({super.key});

  @override
  State<NavigationShell> createState() => _NavigationShellState();
}

class _NavigationShellState extends State<NavigationShell> {
  int _selectedIndex = 0;

  late final List<Widget> _screens;

  @override
  void initState() {
    super.initState();
    _screens = [
      HomeScreen(onNavigate: _onNavigate),
      FlexyScreen(),
      IdoomScreen(),
      CardsScreen(),
      SettingsScreen(),
    ];
  }

  void _onNavigate(int index) {
    setState(() {
      _selectedIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<AuthBloc, AuthState>(
      builder: (context, authState) {
        if (authState is! Authenticated) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }

        return Scaffold(
          body: IndexedStack(
            index: _selectedIndex,
            children: _screens,
          ),
          bottomNavigationBar: BottomNavigationBar(
            currentIndex: _selectedIndex,
            onTap: _onNavigate,
            type: BottomNavigationBarType.fixed,
            backgroundColor: AppColors.bgSecondary,
            selectedItemColor: AppColors.accent,
            unselectedItemColor: AppColors.textMuted,
            selectedLabelStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
            unselectedLabelStyle: const TextStyle(fontSize: 10),
            items: const [
              BottomNavigationBarItem(
                icon: Icon(Icons.home_outlined),
                activeIcon: Icon(Icons.home),
                label: 'الرئيسية',
              ),
              BottomNavigationBarItem(
                icon: Icon(Icons.flash_on_outlined),
                activeIcon: Icon(Icons.flash_on),
                label: 'فليكسي',
              ),
              BottomNavigationBarItem(
                icon: Icon(Icons.wifi_outlined),
                activeIcon: Icon(Icons.wifi),
                label: 'أيدوم',
              ),
              BottomNavigationBarItem(
                icon: Icon(Icons.credit_card_outlined),
                activeIcon: Icon(Icons.credit_card),
                label: 'البطاقات',
              ),
              BottomNavigationBarItem(
                icon: Icon(Icons.settings_outlined),
                activeIcon: Icon(Icons.settings),
                label: 'الإعدادات',
              ),
            ],
          ),
        );
      },
    );
  }
}
