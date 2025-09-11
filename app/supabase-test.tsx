import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { supabase } from '../supabaseClient'; // adjust path if needed

export default function SupabaseTest() {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    async function testTables() {
      const testEmail = 'john@example.com';

      // Check if the user already exists
      const { data: existingUser, error: fetchError } = await supabase
        .from('users') // lowercase table name
        .select('*')
        .eq('email', testEmail)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.log('Fetch Error:', fetchError);
        setLogs(prev => [...prev, `Fetch Error: ${fetchError.message}`]);
        return;
      }

      if (!existingUser) {
        // Insert a new user
        const { data, error } = await supabase
          .from('users')
          .insert([{ name: 'John Doe', email: testEmail, role: 'Vendor' }]);

        if (error) {
          console.log('Insert Error:', error);
          setLogs(prev => [...prev, `Insert Error: ${error.message}`]);
        } else {
          console.log('Inserted User:', data);
          setLogs(prev => [...prev, `Inserted User: ${JSON.stringify(data)}`]);
        }
      } else {
        setLogs(prev => [...prev, `User already exists: ${JSON.stringify(existingUser)}`]);
      }

      // Fetch all users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*');

      if (usersError) {
        console.log('Fetch Users Error:', usersError);
        setLogs(prev => [...prev, `Fetch Users Error: ${usersError.message}`]);
      } else {
        console.log('All Users:', users);
        setLogs(prev => [...prev, `All Users: ${JSON.stringify(users)}`]);
      }
    }

    testTables();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', padding: 20 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>Supabase Test Running...</Text>
      <ScrollView style={{ width: '100%' }}>
        {logs.map((log, index) => (
          <Text key={index} style={{ marginBottom: 5, color: '#333' }}>
            {log}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}
