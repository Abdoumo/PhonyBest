import 'package:equatable/equatable.dart';

abstract class FlexyEvent extends Equatable {
  const FlexyEvent();

  @override
  List<Object?> get props => [];
}

class SendFlexyRequested extends FlexyEvent {
  final String operator;
  final String number;
  final double amount;
  final String? offer;

  const SendFlexyRequested({
    required this.operator,
    required this.number,
    required this.amount,
    this.offer,
  });

  @override
  List<Object?> get props => [operator, number, amount, offer];
}

class FetchFlexyHistory extends FlexyEvent {
  final String? status;
  final String? operator;
  final String? search;
  final int page;

  const FetchFlexyHistory({
    this.status,
    this.operator,
    this.search,
    this.page = 1,
  });

  @override
  List<Object?> get props => [status, operator, search, page];
}
