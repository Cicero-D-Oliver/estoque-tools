export type RootStackParamList = {
  Splash: undefined;
  Login: { notice?: string } | undefined;
  Register: undefined;
  Organizations: undefined;
  Main: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Tools: undefined;
  Inventory: undefined;
  Movements: undefined;
  Team: undefined;
  Profile: undefined;
};

export type ToolStackParamList = {
  ToolList: undefined;
  ToolDetails: { toolId: number };
};

export type InventoryStackParamList = {
  InventoryList: undefined;
  InventoryDetails: { itemId: number };
};
