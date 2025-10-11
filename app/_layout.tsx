import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="deliverer/order_details" options={{ title: 'Order Details' }} />
    </Stack>
  );
}