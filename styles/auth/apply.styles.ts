import { Platform, StyleSheet } from 'react-native';
import { Colors } from '../../constants/Colors';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 60,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.light.icon,
    fontWeight: '400',
  },
  formContainer: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
  },
  required: {
    color: Colors.light.error,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.input, // White
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.inputBorder, // Gray border
    paddingHorizontal: 16,
    height: 52,
  },
  textAreaWrapper: {
    height: 120,
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  pickerWrapper: {
    paddingHorizontal: 8,
  },
  loadingWrapper: {
    justifyContent: 'center',
    gap: 8,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.light.text,
    fontWeight: '400',
  },
  textArea: {
    height: '100%',
  },
  picker: {
    flex: 1,
    color: Colors.light.text,
    fontSize: 16,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.light.icon,
  },
  roleContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  roleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.light.border,
    paddingVertical: 16,
    paddingHorizontal: 12,
    gap: 8,
  },
  roleOptionSelected: {
    backgroundColor: Colors.light.surface, // White background
    borderColor: Colors.light.primary, // Purple border when selected
    borderWidth: 2,
  },
  roleText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.icon,
  },
  roleTextSelected: {
    color: Colors.light.primary,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.light.border,
    borderStyle: 'dashed',
    paddingVertical: 16,
    gap: 8,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  uploadedFileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  uploadedImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  uploadedFileInfo: {
    flex: 1,
    marginLeft: 12,
  },
  uploadStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  uploadProgressText: {
    fontSize: 14,
    color: Colors.light.icon,
    fontWeight: '500',
  },
  uploadSuccessText: {
    fontSize: 14,
    color: Colors.light.success,
    fontWeight: '500',
  },
  uploadErrorText: {
    fontSize: 14,
    color: Colors.light.error,
    fontWeight: '500',
  },
  removeIconButton: {
    padding: 8,
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 24,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
