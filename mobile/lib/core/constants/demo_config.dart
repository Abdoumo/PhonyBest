class DemoConfig {
  static bool isDemoMode = false;
  
  static double demoWallet = 150000.0;
  static double demoDebt = 20000.0;

  static List<Map<String, dynamic>> demoTransactions = [
    {
      'id': 1,
      'type': 'flexy',
      'operator': 'mobilis',
      'phone_number': '0661234567',
      'amount': 200.0,
      'status': 'success',
      'client_name': 'حساب تجريبي (Demo)',
      'created_at': DateTime.now().subtract(const Duration(minutes: 5)).toIso8601String()
    },
    {
      'id': 2,
      'type': 'idoom',
      'operator': 'idoom',
      'phone_number': '0214567890',
      'amount': 1600.0,
      'status': 'success',
      'client_name': 'حساب تجريبي (Demo)',
      'created_at': DateTime.now().subtract(const Duration(hours: 1)).toIso8601String()
    },
    {
      'id': 3,
      'type': 'buy_cards',
      'operator': 'djezzy',
      'amount': 500.0,
      'status': 'success',
      'client_name': 'حساب تجريبي (Demo)',
      'metadata': '{"quantity":5,"value":100}',
      'created_at': DateTime.now().subtract(const Duration(hours: 3)).toIso8601String()
    }
  ];

  static List<Map<String, dynamic>> demoCards = [
    {'id': 101, 'serial': 'MOB-987654321', 'pin': '8765-4321-0987', 'operator': 'mobilis', 'value': 100.0, 'status': 'available'},
    {'id': 102, 'serial': 'MOB-987654322', 'pin': '8765-4321-0988', 'operator': 'mobilis', 'value': 100.0, 'status': 'available'},
    {'id': 103, 'serial': 'DJZ-123456789', 'pin': '1234-5678-9012', 'operator': 'djezzy', 'value': 500.0, 'status': 'available'},
    {'id': 104, 'serial': 'OOR-555666777', 'pin': '5556-6677-7888', 'operator': 'ooredoo', 'value': 1000.0, 'status': 'available'},
  ];

  static void reset() {
    demoWallet = 150000.0;
    demoDebt = 20000.0;
    demoTransactions = [
      {
        'id': 1,
        'type': 'flexy',
        'operator': 'mobilis',
        'phone_number': '0661234567',
        'amount': 200.0,
        'status': 'success',
        'client_name': 'حساب تجريبي (Demo)',
        'created_at': DateTime.now().subtract(const Duration(minutes: 5)).toIso8601String()
      },
      {
        'id': 2,
        'type': 'idoom',
        'operator': 'idoom',
        'phone_number': '0214567890',
        'amount': 1600.0,
        'status': 'success',
        'client_name': 'حساب تجريبي (Demo)',
        'created_at': DateTime.now().subtract(const Duration(hours: 1)).toIso8601String()
      },
      {
        'id': 3,
        'type': 'buy_cards',
        'operator': 'djezzy',
        'amount': 500.0,
        'status': 'success',
        'client_name': 'حساب تجريبي (Demo)',
        'metadata': '{"quantity":5,"value":100}',
        'created_at': DateTime.now().subtract(const Duration(hours: 3)).toIso8601String()
      }
    ];
    demoCards = [
      {'id': 101, 'serial': 'MOB-987654321', 'pin': '8765-4321-0987', 'operator': 'mobilis', 'value': 100.0, 'status': 'available'},
      {'id': 102, 'serial': 'MOB-987654322', 'pin': '8765-4321-0988', 'operator': 'mobilis', 'value': 100.0, 'status': 'available'},
      {'id': 103, 'serial': 'DJZ-123456789', 'pin': '1234-5678-9012', 'operator': 'djezzy', 'value': 500.0, 'status': 'available'},
      {'id': 104, 'serial': 'OOR-555666777', 'pin': '5556-6677-7888', 'operator': 'ooredoo', 'value': 1000.0, 'status': 'available'},
    ];
  }
}
