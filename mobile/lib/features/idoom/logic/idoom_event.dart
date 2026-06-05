import 'package:equatable/equatable.dart';

abstract class IdoomEvent extends Equatable {
  const IdoomEvent();

  @override
  List<Object?> get props => [];
}

class RechargeIdoomRequested extends IdoomEvent {
  final String ssuid;
  final double amount;
  final String type;

  const RechargeIdoomRequested({
    required this.ssuid,
    required this.amount,
    required this.type,
  });

  @override
  List<Object?> get props => [ssuid, amount, type];
}

class FetchIdoomHistory extends IdoomEvent {
  final int page;

  const FetchIdoomHistory({this.page = 1});

  @override
  List<Object?> get props => [page];
}
