/**
 * SettingsScreen — App settings and account management.
 *
 * Design System: RelateApp_DesignSpec.md (warm light theme)
 *
 * Layout:
 *   - bgPrimary (#FAF7F4) background
 *   - Clean list items with warm borders (#E8DDD4)
 *   - Sections: Partner, Account, Notifications, Privacy, About
 *   - Logout button (danger variant)
 *
 * Uses Card component for grouped sections and warm-light styling
 * throughout.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Share,
  Pressable,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  User,
  Bell,
  Shield,
  Info,
  ChevronRight,
  UserPlus,
  LogOut,
  FileText,
  Brain,
  Trash2,
  Heart,
  Mail,
} from 'lucide-react-native';
import { SafeArea } from '../../components/layout/SafeArea';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { LegalDocumentModal } from '../../components/domain/LegalDocumentModal';
import { CrisisResourcesModal } from '../../components/domain/CrisisResourcesModal';
import { colors } from '../../theme/colors';
import { fontFamilies } from '../../theme/typography';
import { spacing, radius, shadows } from '../../theme/spacing';
import { useAuth } from '../../hooks/useAuth';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { createInvite } from '../../services/auth';
import { successTap } from '../../utils/haptics';
import type { MainNavigatorParamList } from '../../navigation/MainNavigator';

type Navigation = NativeStackNavigationProp<MainNavigatorParamList>;

// ── Menu Item Component ─────────────────────────────────────────────

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
  trailing?: React.ReactNode;
  danger?: boolean;
}

function MenuItem({ icon, label, onPress, trailing, danger }: MenuItemProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.menuItem,
        pressed && { backgroundColor: colors.bgSecondary },
      ]}
      onPress={onPress}
      accessibilityLabel={label}
    >
      <View style={styles.menuItemLeft}>
        {icon}
        <Text
          style={[
            styles.menuItemLabel,
            danger && { color: colors.error },
          ]}
        >
          {label}
        </Text>
      </View>
      {trailing || (
        <ChevronRight size={18} color={colors.textMuted} strokeWidth={1.8} />
      )}
    </Pressable>
  );
}

// ── Settings Screen ─────────────────────────────────────────────────

export function SettingsScreen() {
  const navigation = useNavigation<Navigation>();
  const { logout } = useAuth();
  const couple = useAuthStore((s) => s.couple);
  const setCouple = useAuthStore((s) => s.setCouple);
  const addToast = useUIStore((s) => s.addToast);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [legalDoc, setLegalDoc] = useState<'terms' | 'privacy' | null>(null);
  const [crisisVisible, setCrisisVisible] = useState(false);

  const hasCoupleFormed = couple && couple.userBId;

  const doLogout = async () => {
    await logout();
    addToast('You have been signed out.', 'info');
  };

  const handleInvitePartner = useCallback(async () => {
    setInviteLoading(true);
    try {
      const res = await createInvite();
      setCouple(res.couple);
      const inviteLink = `relationcounselor://invite/${res.inviteToken}`;
      await Share.share({
        message: `Join me on Relate so we can strengthen our relationship together. Use this invite code: ${res.inviteToken}\n\nOr tap: ${inviteLink}`,
      });
      successTap();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      if (msg) {
        addToast(Array.isArray(msg) ? msg[0] : msg, 'error');
      }
    } finally {
      setInviteLoading(false);
    }
  }, [setCouple, addToast]);

  return (
    <SafeArea>
      <Header
        title="Settings"
        left={
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={22} color={colors.orangeMid} strokeWidth={2} />
          </Pressable>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Partner Section */}
        <Text style={styles.sectionTitle}>Partner</Text>
        <View style={styles.section}>
          {!hasCoupleFormed ? (
            <>
              <View style={styles.partnerEmpty}>
                <Text style={styles.partnerEmptyText}>
                  Invite your partner to get the full experience. Sessions work
                  best when both partners participate.
                </Text>
              </View>
              <MenuItem
                icon={<UserPlus size={20} color={colors.orangeMid} strokeWidth={1.8} />}
                label="Invite partner"
                onPress={handleInvitePartner}
              />
            </>
          ) : (
            <View style={styles.partnerRow}>
              <View
                style={[
                  styles.partnerAvatar,
                  { backgroundColor: colors.orangeTint },
                ]}
              >
                <Text style={styles.partnerInitial}>
                  {(couple?.userB?.name || couple?.userA?.name || 'P')[0].toUpperCase()}
                </Text>
              </View>
              <Text style={styles.partnerName}>
                {couple?.userB?.name || couple?.userA?.name || 'Partner'}
              </Text>
            </View>
          )}
        </View>

        {/* Account Section */}
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.section}>
          <MenuItem
            icon={<User size={20} color={colors.textSecondary} strokeWidth={1.8} />}
            label="Profile"
            onPress={() => navigation.navigate('Profile')}
          />
        </View>

        {/* Notifications Section */}
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.section}>
          <MenuItem
            icon={<Bell size={20} color={colors.textSecondary} strokeWidth={1.8} />}
            label="Push notifications"
            trailing={<Text style={styles.trailingText}>On</Text>}
          />
        </View>

        {/* Privacy Section */}
        <Text style={styles.sectionTitle}>Privacy</Text>
        <View style={styles.section}>
          <MenuItem
            icon={<FileText size={20} color={colors.textSecondary} strokeWidth={1.8} />}
            label="Privacy Policy"
            onPress={() => setLegalDoc('privacy')}
          />
          <MenuItem
            icon={<FileText size={20} color={colors.textSecondary} strokeWidth={1.8} />}
            label="Terms of Service"
            onPress={() => setLegalDoc('terms')}
          />
          <MenuItem
            icon={<Brain size={20} color={colors.textSecondary} strokeWidth={1.8} />}
            label="AI Data Processing"
            trailing={<Text style={styles.trailingText}>Consented</Text>}
          />
          <MenuItem
            icon={<Trash2 size={20} color={colors.error} strokeWidth={1.8} />}
            label="Delete Account"
            onPress={() => navigation.navigate('DeleteAccount')}
            danger
          />
        </View>

        {/* About Section */}
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.section}>
          <MenuItem
            icon={<Heart size={20} color={colors.textSecondary} strokeWidth={1.8} />}
            label="Crisis Resources"
            onPress={() => setCrisisVisible(true)}
          />
          <MenuItem
            icon={<Mail size={20} color={colors.textSecondary} strokeWidth={1.8} />}
            label="Contact Support"
            onPress={() => Linking.openURL('mailto:support@relatehq.com')}
          />
          <MenuItem
            icon={<Info size={20} color={colors.textSecondary} strokeWidth={1.8} />}
            label="About Relate"
            trailing={<Text style={styles.trailingText}>v1.0.0</Text>}
          />
        </View>

        {/* Logout */}
        <View style={styles.logoutSection}>
          <Button
            title="Sign out"
            variant="danger"
            onPress={doLogout}
            icon={<LogOut size={18} color="#FFFFFF" strokeWidth={2} />}
          />
        </View>

        {/* Version */}
        <Text style={styles.versionText}>Relate v1.0.0</Text>
      </ScrollView>

      {/* Legal Document Modal */}
      <LegalDocumentModal
        visible={legalDoc !== null}
        onClose={() => setLegalDoc(null)}
        documentType={legalDoc || 'terms'}
      />

      {/* Crisis Resources Modal */}
      <CrisisResourcesModal
        visible={crisisVisible}
        onClose={() => setCrisisVisible(false)}
      />
    </SafeArea>
  );
}

// ── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['2xl'],
  },

  // Section header
  sectionTitle: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },

  // Section container
  section: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },

  // Menu items
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemLabel: {
    fontFamily: fontFamilies.body,
    fontSize: 15,
    color: colors.textPrimary,
  },
  trailingText: {
    fontFamily: fontFamilies.body,
    fontSize: 14,
    color: colors.textMuted,
  },

  // Partner
  partnerEmpty: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  partnerEmptyText: {
    fontFamily: fontFamilies.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  partnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: 12,
  },
  partnerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerInitial: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 16,
    fontWeight: '700',
    color: colors.orangeMid,
  },
  partnerName: {
    fontFamily: fontFamilies.body,
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },

  // Logout
  logoutSection: {
    marginTop: spacing.xl,
  },

  // Version
  versionText: {
    fontFamily: fontFamilies.body,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
