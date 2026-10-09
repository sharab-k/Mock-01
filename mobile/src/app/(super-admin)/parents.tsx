import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Check, Copy, EyeOff, KeyRound, X } from 'lucide-react-native';

import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusPill } from '@/components/ui/status-pill';
import { TextField } from '@/components/ui/text-field';
import { SetPasswordModal } from '@/components/set-password-modal';
import { Ink, Radius, Semantic, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchParentDirectory, revealParentPasswordAction, setParentPasswordAction, type ParentDirectoryRow } from '@/lib/actions/parents';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function allDetailsText(p: ParentDirectoryRow, password?: string): string {
  return [
    `Parent: ${p.name}`,
    `Username: ${p.email}`,
    ...(password ? [`Password: ${password}`] : []),
    `Phone: ${p.phone}`,
    ...(p.secondaryPhone ? [`Secondary phone: ${p.secondaryPhone}`] : []),
    ...(p.whatsapp2 ? [`WhatsApp: ${p.whatsapp2}`] : []),
    'Children:',
    ...p.children.map((c) => `  - ${c.name} · Grade ${c.grade}-${c.section} · Roll ${c.roll}${c.grNumber ? ` · GR# ${c.grNumber}` : ''}`),
  ].join('\n');
}

// A labelled value with its own Copy button — flips to "Copied" for a moment
// so it's obvious the tap worked.
function CopyRow({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  const [copied, setCopied] = useState(false);

  async function copy() {
    await Clipboard.setStringAsync(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <View style={[styles.copyRow, { backgroundColor: theme.surfaceElement, borderColor: theme.border }]}>
      <View style={{ flex: 1 }}>
        <ThemedText variant="label" color="textMuted">{label}</ThemedText>
        <ThemedText variant="mono" selectable style={{ fontSize: 13 }}>{value}</ThemedText>
      </View>
      <Pressable onPress={copy} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Copy ${label}`} style={[styles.copyBtn, { backgroundColor: copied ? Semantic.successBg : theme.surface, borderColor: theme.border }]}>
        {copied ? <Check size={13} color={Semantic.success} /> : <Copy size={13} color={Ink[700]} />}
        <ThemedText variant="small" style={{ color: copied ? Semantic.success : Ink[700] }}>{copied ? 'Copied' : 'Copy'}</ThemedText>
      </Pressable>
    </View>
  );
}

export default function ParentDirectoryScreen() {
  const theme = useTheme();
  const [parents, setParents] = useState<ParentDirectoryRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<ParentDirectoryRow | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<ParentDirectoryRow | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  // Passwords are fetched one at a time, on request — never loaded with the list.
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [revealing, setRevealing] = useState(false);
  const [revealError, setRevealError] = useState('');
  // Parents whose password was (re)set from this screen: now on record.
  const [recordedNow, setRecordedNow] = useState<Set<string>>(new Set());

  const hasPassword = (p: ParentDirectoryRow) => p.hasStoredPassword || recordedNow.has(p.key);

  async function reveal(p: ParentDirectoryRow) {
    setRevealing(true);
    setRevealError('');
    const outcome = await revealParentPasswordAction(p.key);
    setRevealing(false);
    if (!outcome.ok) { setRevealError(outcome.error); return; }
    setRevealed((prev) => ({ ...prev, [p.key]: outcome.password }));
  }

  function hide(p: ParentDirectoryRow) {
    setRevealed((prev) => {
      const next = { ...prev };
      delete next[p.key];
      return next;
    });
  }

  useEffect(() => {
    let mounted = true;
    fetchParentDirectory().then((result) => {
      if (!mounted) return;
      if (!result.ok) { setError(result.error); return; }
      setParents(result.parents);
    });
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    if (!parents) return [];
    const q = query.trim().toLowerCase();
    if (!q) return parents;
    return parents.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      p.phone.includes(q) ||
      p.children.some((c) => c.name.toLowerCase().includes(q) || c.roll.toLowerCase().includes(q)),
    );
  }, [parents, query]);

  async function copyAll(p: ParentDirectoryRow) {
    await Clipboard.setStringAsync(allDetailsText(p, revealed[p.key]));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 1500);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <ScreenHeader title="Parent Directory" subtitle={parents ? `${parents.length} parent accounts · tap one for details` : undefined} onBack={() => router.back()} />
        </View>

        {error && (
          <View style={styles.centered}><ThemedText color="textSecondary">{error}</ThemedText></View>
        )}

        {!error && !parents && (
          <View style={styles.centered}><ActivityIndicator color={theme.accent} /></View>
        )}

        {parents && (
          <ScrollView contentContainerStyle={styles.list}>
            <TextField placeholder="Search parent, child, username or phone…" value={query} onChangeText={setQuery} autoCapitalize="none" />
            {filtered.length === 0 && (
              <ThemedText color="textSecondary" style={{ textAlign: 'center', marginTop: Spacing.four }}>No parents match this search.</ThemedText>
            )}
            {filtered.filter(Boolean).map((p) => (
              <Pressable key={p.key} onPress={() => { setSelected(p); setCopiedAll(false); setRevealError(''); }}>
                <Card style={{ gap: Spacing.two }}>
                  <View style={styles.row}>
                    <Avatar name={p.name} size={36} />
                    <View style={{ flex: 1 }}>
                      <ThemedText variant="small">{p.name}</ThemedText>
                      <ThemedText variant="mono" color="textMuted" style={{ fontSize: 11 }}>{p.email}</ThemedText>
                    </View>
                  </View>
                  <ThemedText variant="small" color="textMuted">{p.phone}</ThemedText>
                  <View style={styles.chipsRow}>
                    {p.children.map((c) => (
                      <View key={c.roll} style={[styles.chip, { backgroundColor: theme.surfaceElement }]}>
                        <ThemedText variant="small" color="textSecondary">{c.name}</ThemedText>
                        <ThemedText variant="mono" color="textMuted" style={{ fontSize: 10 }}> · {c.grade}{c.section}</ThemedText>
                      </View>
                    ))}
                  </View>
                </Card>
              </Pressable>
            ))}
          </ScrollView>
        )}

        <Modal visible={!!selected} animationType="slide" onRequestClose={() => setSelected(null)}>
          <ThemedView style={{ flex: 1 }}>
            <SafeAreaView style={{ flex: 1 }}>
              {selected && (
                <>
                  <View style={styles.modalHeader}>
                    <ThemedText variant="title" style={{ fontSize: 18, flex: 1 }}>Parent Details</ThemedText>
                    <Pressable onPress={() => setSelected(null)} hitSlop={8}><X size={20} color={theme.textSecondary} /></Pressable>
                  </View>
                  <ScrollView contentContainerStyle={styles.modalContent}>
                    <View style={styles.row}>
                      <Avatar name={selected.name} size={52} />
                      <View style={{ flex: 1, gap: 4 }}>
                        <ThemedText variant="bodyMedium">{selected.name}</ThemedText>
                        <View style={styles.row}>
                          <StatusPill tone={selected.isActive ? 'success' : 'neutral'} label={selected.isActive ? 'Active' : 'Inactive'} />
                          <ThemedText variant="small" color="textMuted">Since {formatDate(selected.createdAt)}</ThemedText>
                        </View>
                      </View>
                    </View>

                    <Button label={copiedAll ? 'All details copied' : 'Copy all details'} variant={copiedAll ? 'secondary' : 'primary'} onPress={() => copyAll(selected)} fullWidth />

                    <ThemedText variant="label" color="textMuted">Login credentials</ThemedText>
                    <CopyRow label="Username" value={selected.email} />
                    {revealed[selected.key] ? (
                      <>
                        <CopyRow label="Password" value={revealed[selected.key]} />
                        <Pressable onPress={() => hide(selected)} style={styles.resetBtn}>
                          <EyeOff size={14} color={theme.textMuted} />
                          <ThemedText variant="small" color="textMuted">Hide password</ThemedText>
                        </Pressable>
                      </>
                    ) : hasPassword(selected) ? (
                      <View style={[styles.copyRow, { backgroundColor: theme.surfaceElement, borderColor: theme.border, flexDirection: 'column', alignItems: 'stretch' }]}>
                        <ThemedText variant="label" color="textMuted">Password</ThemedText>
                        <ThemedText variant="mono" color="textMuted" style={{ letterSpacing: 3 }}>••••••••••••</ThemedText>
                        <Button label={revealing ? 'Loading…' : 'Show password'} variant="secondary" loading={revealing} onPress={() => reveal(selected)} fullWidth />
                        {!!revealError && <ThemedText variant="small" style={{ color: Semantic.danger }}>{revealError}</ThemedText>}
                        <ThemedText variant="small" color="textMuted" style={{ fontSize: 11 }}>Each view is recorded in the audit log.</ThemedText>
                      </View>
                    ) : (
                      <View style={[styles.passwordNote, { backgroundColor: Semantic.warningBg }]}>
                        <ThemedText variant="small" style={{ fontWeight: '600' }}>Password not on record</ThemedText>
                        <ThemedText variant="small" color="textSecondary" style={{ lineHeight: 19 }}>
                          This account&apos;s password was set before passwords were recorded, so it can&apos;t be shown. Set a new one here — it will be saved and visible from now on.
                        </ThemedText>
                      </View>
                    )}
                    <Pressable onPress={() => setPasswordTarget(selected)} style={styles.resetBtn}>
                      <KeyRound size={14} color={Ink[700]} />
                      <ThemedText variant="small" style={{ color: Ink[700] }}>Set a new password</ThemedText>
                    </Pressable>

                    <ThemedText variant="label" color="textMuted">Contact</ThemedText>
                    <CopyRow label="Phone / WhatsApp" value={selected.phone} />
                    {!!selected.secondaryPhone && <CopyRow label="Secondary phone" value={selected.secondaryPhone} />}
                    {!!selected.whatsapp2 && <CopyRow label="Second WhatsApp" value={selected.whatsapp2} />}

                    <ThemedText variant="label" color="textMuted">Linked children ({selected.children.length})</ThemedText>
                    {selected.children.map((c) => (
                      <Card key={c.roll} style={{ gap: 2 }}>
                        <ThemedText variant="small" style={{ fontWeight: '600' }}>{c.name}</ThemedText>
                        <ThemedText variant="mono" color="textMuted" style={{ fontSize: 11 }}>
                          Grade {c.grade}-{c.section} · Roll {c.roll}{c.grNumber ? ` · GR# ${c.grNumber}` : ''}
                        </ThemedText>
                      </Card>
                    ))}
                  </ScrollView>
                </>
              )}

              <SetPasswordModal
                visible={!!passwordTarget}
                targetName={passwordTarget?.name ?? ''}
                username={passwordTarget?.email ?? ''}
                onClose={() => setPasswordTarget(null)}
                onSubmit={async (newPassword) => {
                  const outcome = await setParentPasswordAction({ id: passwordTarget!.key, newPassword });
                  if (outcome.ok) {
                    // The old revealed value is stale either way; the new one is on
                    // record only if the server managed to save it.
                    hide(passwordTarget!);
                    if (outcome.recorded) setRecordedNow((prev) => new Set(prev).add(passwordTarget!.key));
                  }
                  return outcome;
                }}
              />
            </SafeAreaView>
          </ThemedView>
        </Modal>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { padding: Spacing.four, paddingBottom: Spacing.two },
  list: { padding: Spacing.four, paddingTop: 0, gap: Spacing.three, paddingBottom: Spacing.six },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 999 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', padding: Spacing.four },
  modalContent: { padding: Spacing.four, paddingTop: 0, gap: Spacing.three, paddingBottom: Spacing.six },
  copyRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, borderWidth: 1, borderRadius: Radius.md, paddingVertical: 10, paddingHorizontal: 12 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: Radius.md, paddingVertical: 7, paddingHorizontal: 10 },
  passwordNote: { borderRadius: Radius.md, padding: Spacing.three, gap: 6 },
  resetBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 4 },
});
