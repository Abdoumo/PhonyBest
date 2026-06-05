import 'package:equatable/equatable.dart';

abstract class IdoomState extends Equatable {
  const IdoomState();

  @override
  List<Object?> get props => [];
}

class IdoomInitial extends IdoomState {}

class IdoomSubmitting extends IdoomState {}

class IdoomSuccess extends IdoomState {
  final Map<String, dynamic> transaction;

  const IdoomSuccess({required this.transaction});

  @override
  List<Object?> get props => [transaction];
}

class IdoomFailure extends IdoomState {
  final String error;

  const IdoomFailure({required this.error});

  @override
  List<Object?> get props => [error];
}

class IdoomHistoryLoading extends IdoomState {}

class IdoomHistoryLoaded extends IdoomState {
  final List<dynamic> transactions;
  final int page;
  final bool hasReachedMax;

  const IdoomHistoryLoaded({
    required this.transactions,
    required this.page,
    required this.hasReachedMax,
  });

  @override
  List<Object?> get props => [transactions, page, hasReachedMax];
}

class IdoomHistoryFailure extends IdoomState {
  final String error;

  const IdoomHistoryFailure({required this.error});

  @override
  List<Object?> get props => [error];
}
