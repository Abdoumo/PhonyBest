import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'core/constants/app_colors.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/data/auth_api_client.dart';
import 'features/auth/logic/auth_bloc.dart';
import 'features/auth/logic/auth_event.dart';
import 'features/auth/logic/auth_state.dart';
import 'features/auth/ui/login_screen.dart';
import 'features/cards/data/cards_api_client.dart';
import 'features/cards/logic/cards_bloc.dart';
import 'features/dashboard/data/dashboard_api_client.dart';
import 'features/dashboard/logic/dashboard_bloc.dart';
import 'features/dashboard/ui/navigation_shell.dart';
import 'features/flexy/data/flexy_api_client.dart';
import 'features/flexy/logic/flexy_bloc.dart';
import 'features/idoom/data/idoom_api_client.dart';
import 'features/idoom/logic/idoom_bloc.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider<AuthBloc>(
          create: (context) => AuthBloc(
            authApiClient: AuthApiClient(),
          )..add(AppStarted()),
        ),
        BlocProvider<DashboardBloc>(
          create: (context) => DashboardBloc(
            dashboardApiClient: DashboardApiClient(),
          ),
        ),
        BlocProvider<FlexyBloc>(
          create: (context) => FlexyBloc(
            flexyApiClient: FlexyApiClient(),
          ),
        ),
        BlocProvider<IdoomBloc>(
          create: (context) => IdoomBloc(
            idoomApiClient: IdoomApiClient(),
          ),
        ),
        BlocProvider<CardsBloc>(
          create: (context) => CardsBloc(
            cardsApiClient: CardsApiClient(),
          ),
        ),
      ],
      child: MaterialApp(
        title: 'FLEXY GSM',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.darkTheme,
        themeMode: ThemeMode.dark,
        // Localization configurations supporting Arabic and French
        localizationsDelegates: [
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        supportedLocales: const [
          Locale('ar', 'DZ'),
          Locale('fr', 'FR'),
        ],
        locale: const Locale('ar', 'DZ'), // Default RTL Arabic
        home: const AppNavigationManager(),
      ),
    );
  }
}

class AppNavigationManager extends StatelessWidget {
  const AppNavigationManager({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<AuthBloc, AuthState>(
      builder: (context, state) {
        if (state is Authenticated) {
          return const NavigationShell();
        }

        if (state is Unauthenticated) {
          return const LoginScreen();
        }

        // Show a premium dark splash screen while checking session tokens
        return Scaffold(
          body: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [AppColors.accent, Color(0xFFA78BFA)],
                    ),
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.accent.withOpacity(0.4),
                        blurRadius: 30,
                        offset: const Offset(0, 10),
                      ),
                    ],
                  ),
                  alignment: Alignment.center,
                  child: const Text(
                    '⚡',
                    style: TextStyle(fontSize: 36),
                  ),
                ),
                const SizedBox(height: 24),
                const CircularProgressIndicator(
                  color: AppColors.accent,
                  strokeWidth: 2.5,
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
