export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  OtpVerify: undefined;
};

export type RootStackParamList = {
  Home: undefined;
  Settings: undefined;
  JoinJamaat: undefined;
  JamaatDetail: { jamaatId: number };
  Members: { jamaatId: number };
  Expenses: { jamaatId: number };
  Settlement: { jamaatId: number };
  JamaatCompleted: { jamaatId: number };
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
