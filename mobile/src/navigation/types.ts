export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  Organizations: undefined;
  Main: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Tools: undefined;
  Profile: undefined;
};

export type ToolStackParamList = {
  ToolList: undefined;
  ToolDetails: { toolId: number };
};

export const futureOperationalRoutes = [
  'Estoque',
  'Movimentacoes',
  'Equipe',
] as const;
