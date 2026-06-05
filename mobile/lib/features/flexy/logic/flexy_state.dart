import 'package:equatable/equatable.dart';

abstract class FlexyState extends Equatable {
  const FlexyState();

  @override
  List<Object?> get props => [];
}

class FlexyInitial extends FlexyState {}

// Send Flexy Recharges
class FlexySubmitting extends FlexyState {}

class FlexySuccess extends FlexyState {
  final Map<String, dynamic> transaction;

  const FlexySuccess({required this.transaction});

  @override
  List<Object?> get props => [transaction];
}

class FlexyFailure extends FlexyState {
  final String error;

  const FlexyFailure({required this.error});

  @override
  List<Object?> get props => [error];
}

// History states
class FlexyHistoryLoading extends FlexyState {}

class FlexyHistoryLoaded extends FlexyState {
  final List<dynamic> transactions;
  final int page;
  final bool hasReachedMax;

  const FlexyHistoryLoaded({
    required this.transactions,
    required this.page,
    required this.hasReachedMax,
  });

  @override
  List<Object?> get props => [transactions, page, hasReachedMax];
}

class FlexyHistoryFailure extends FlexyState {
  final String error;

  const FlexyHistoryFailure({required this.error});

  @override
  List<Object?> get props => [error];
}
