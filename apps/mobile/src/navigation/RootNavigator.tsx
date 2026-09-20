import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { BottomTabNavigator } from "./BottomTabNavigator";
import { NoteDetailScreen } from "../screens/NoteDetailScreen";

const Stack = createNativeStackNavigator();
const NavContainer = NavigationContainer as any;
const StackNav = Stack.Navigator as any;
const StackScreen = Stack.Screen as any;

export const RootNavigator = () => {
  return (
    <NavContainer>
      <StackNav screenOptions={{ headerShown: false }}>
        <StackScreen name="MainTabs" component={BottomTabNavigator} />
        <StackScreen
          name="NoteDetail"
          component={NoteDetailScreen}
          options={{ animation: "slide_from_right" }}
        />
      </StackNav>
    </NavContainer>
  );
};
