import { StyleSheet } from 'react-native';
import { Colors } from '../../constants/Colors';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: Colors.light.background,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: Colors.light.text,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
    color: Colors.light.text,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginBottom: 15,
    padding: 10,
    borderRadius: 5,
    color: Colors.light.text,
    backgroundColor: Colors.light.input,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 5,
    marginBottom: 15,
    backgroundColor: Colors.light.input,
  },
  picker: {
    height: 50,
    color: Colors.light.text,
  },
  link: {
    marginTop: 15,
    textAlign: 'center',
    color: Colors.light.primary,
  },
});
