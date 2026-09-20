import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { HomeScreen } from "../screens/HomeScreen";
import { FitnessScreen } from "../screens/FitnessScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { useNotesStore } from "../store/useNotesStore";
import { colors } from "../theme";
import { useTranslation } from "react-i18next";
import { Text } from "react-native";

const Tab = createBottomTabNavigator();
const TabNav = Tab.Navigator as any;
const TabScreen = Tab.Screen as any;

export const BottomTabNavigator = () => {
  const { t } = useTranslation();
  const isDarkMode = useNotesStore((state) => state.isDarkMode);
  const theme = isDarkMode ? colors.dark : colors.light;

  return (
    <TabNav
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopColor: theme.border,
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
      }}
    >
      <TabScreen
        name="NotesTab"
        component={HomeScreen}
        options={{
          title: "Notes",
          tabBarLabel: "Notes",
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>📝</Text>,
        }}
      />
      <TabScreen
        name="FitnessTab"
        component={FitnessScreen}
        options={{
          title: "Fitness",
          tabBarLabel: "Fitness",
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🥗</Text>,
        }}
      />
      <TabScreen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: "Profile",
          tabBarLabel: "Profile",
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>👤</Text>,
        }}
      />
    </TabNav>
  );
};
