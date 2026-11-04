import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Chip, Searchbar, Snackbar, Text } from 'react-native-paper';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { useOrganization } from '@/providers/OrganizationProvider';
import { invalidateTeamCaches, teamKeys, teamService, type TeamAction } from '@/services/team-service';
import type { MemberProfile, OrganizationMember } from '@/types/api';
import { TeamActionDialog } from '@/features/team/TeamActionDialog';
import { AddTeamMemberDialog } from '@/features/team/AddTeamMemberDialog';
import { TeamMemberItem } from '@/features/team/TeamMemberItem';
import {
  combineMembers,
  filterMembers,
  isLastActiveAdmin,
  teamFilterLabels,
  teamRequestError,
  type TeamFilter,
} from '@/features/team/team-ui';
import { colors, spacing } from '@/theme';

const filters: TeamFilter[] = ['all', 'active', 'pending'];

export function TeamScreen() {
  const queryClient = useQueryClient();
  const { account } = useAuth();
  const { activeOrganization } = useOrganization();
  const organizationId = activeOrganization?.id ?? 0;
  const [filter, setFilter] = useState<TeamFilter>('all');
  const [search, setSearch] = useState('');
  const [action, setAction] = useState<TeamAction | null>(null);
  const [selectedMember, setSelectedMember] = useState<OrganizationMember | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  useEffect(() => {
    setFilter('all');
    setSearch('');
    setAction(null);
    setSelectedMember(null);
    setAddOpen(false);
  }, [organizationId]);

  const membersQuery = useQuery({ queryKey: teamKeys.members(organizationId), queryFn: () => teamService.listMembers(organizationId), enabled: organizationId > 0 });
  const pendingQuery = useQuery({ queryKey: teamKeys.pending(organizationId), queryFn: () => teamService.listPending(organizationId), enabled: organizationId > 0 });
  const invitationsQuery = useQuery({ queryKey: teamKeys.invitations(organizationId), queryFn: () => teamService.listInvitations(organizationId), enabled: organizationId > 0 });
  const members = useMemo(() => combineMembers(membersQuery.data ?? [], pendingQuery.data ?? [], organizationId), [membersQuery.data, organizationId, pendingQuery.data]);
  const visible = useMemo(() => filterMembers(members, filter, search), [filter, members, search]);
  const pendingCount = members.filter((member) => member.status === 'PENDENTE').length;
  const mutation = useMutation({
    mutationFn: async ({ requestedAction, member, profile }: { requestedAction: TeamAction; member: OrganizationMember; profile?: MemberProfile }) => {
      if (requestedAction === 'approve') {
        if (profile !== 'OPERADOR' && profile !== 'CONSULTA') throw new Error('Perfil inválido.');
        return teamService.approve(organizationId, member.id, profile);
      }
      if (requestedAction === 'profile') {
        if (!profile) throw new Error('Perfil inválido.');
        return teamService.updateProfile(organizationId, member.id, profile);
      }
      return teamService.remove(organizationId, member.id);
    },
    onSuccess: async (_result, request) => {
      setFeedback(request.requestedAction === 'approve' ? 'Acesso aprovado.' : request.requestedAction === 'profile' ? 'Perfil atualizado.' : 'Acesso removido.');
      setAction(null);
      setSelectedMember(null);
      await invalidateTeamCaches(queryClient, organizationId);
    },
  });
  const addMutation = useMutation({
    mutationFn: ({ email, profile }: { email: string; profile: Exclude<MemberProfile, 'ADMIN'> }) => (
      teamService.invite(organizationId, email, profile)
    ),
    onSuccess: async () => {
      setFeedback('Convite enviado.');
      setAddOpen(false);
      await invalidateTeamCaches(queryClient, organizationId);
    },
  });
  const openAction = (requestedAction: TeamAction, member: OrganizationMember) => {
    mutation.reset();
    setAction(requestedAction);
    setSelectedMember(member);
  };
  const refresh = () => Promise.all([membersQuery.refetch(), pendingQuery.refetch(), invitationsQuery.refetch()]);
  if (membersQuery.isLoading || pendingQuery.isLoading || invitationsQuery.isLoading) return <View style={styles.center}><ActivityIndicator /><Text>Carregando equipe</Text></View>;
  if (membersQuery.isError || pendingQuery.isError || invitationsQuery.isError) return <View style={styles.center}><Text>Não foi possível carregar a equipe.</Text><Button onPress={() => void refresh()}>Tentar novamente</Button></View>;
  return (
    <View style={styles.screen}>
      <FlatList
        data={visible}
        keyExtractor={(member) => String(member.id)}
        contentContainerStyle={visible.length ? styles.list : styles.emptyList}
        refreshing={membersQuery.isFetching || pendingQuery.isFetching}
        onRefresh={() => void refresh()}
        ListHeaderComponent={(
          <View style={styles.header}>
            <View style={styles.heading}>
              <View><Text variant="headlineSmall" style={styles.title}>Equipe</Text><Text style={styles.organization}>{activeOrganization?.nome}</Text></View>
              <Button testID="team-add-member" mode="contained" compact onPress={() => { addMutation.reset(); setAddOpen(true); }}>Convidar pessoa</Button>
            </View>
            <Text style={[styles.summary, pendingCount > 0 && styles.summaryAttention]}>{pendingCount > 0 ? `${pendingCount} ${pendingCount === 1 ? 'pessoa aguarda' : 'pessoas aguardam'} aprovação.` : 'Nenhum acesso aguardando aprovação.'}</Text>
            {(invitationsQuery.data?.length ?? 0) > 0 ? (
              <View style={styles.invitations} accessibilityLabel="Convites da equipe">
                <Text style={styles.invitationTitle}>Convites</Text>
                {invitationsQuery.data?.map((invitation) => (
                  <View key={invitation.id} style={styles.invitationRow}>
                    <Text style={styles.invitationEmail}>{invitation.email}</Text>
                    <Text style={styles.invitationState}>{invitation.status === 'PENDENTE' ? 'Aguardando ativação' : invitation.status === 'CONFIRMADO' ? 'Ativado' : invitation.status === 'EXPIRADO' ? 'Expirado' : 'Revogado'}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            <Searchbar placeholder="Buscar por nome ou e-mail" value={search} onChangeText={setSearch} onClearIconPress={() => setSearch('')} style={styles.search} inputStyle={styles.searchInput} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
              {filters.map((item) => <Chip key={item} compact selected={filter === item} onPress={() => setFilter(item)}>{teamFilterLabels[item]}{item === 'pending' && pendingCount > 0 ? ` (${pendingCount})` : ''}</Chip>)}
            </ScrollView>
            <Text style={styles.count}>{visible.length} {visible.length === 1 ? 'pessoa' : 'pessoas'}</Text>
          </View>
        )}
        ListEmptyComponent={(
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{members.length === 0 ? 'Nenhum membro neste ambiente.' : search.trim() ? `Nenhum resultado para “${search.trim()}”.` : 'Nenhuma pessoa neste filtro.'}</Text>
            {search.trim() ? <Button onPress={() => setSearch('')}>Limpar busca</Button> : null}
            {!search.trim() && filter !== 'all' ? <Button onPress={() => setFilter('all')}>Limpar filtros</Button> : null}
          </View>
        )}
        renderItem={({ item }) => <TeamMemberItem member={item} currentAccountId={account?.id} protectedAdmin={isLastActiveAdmin(item, members)} onAction={(requestedAction) => openAction(requestedAction, item)} />}
      />
      <TeamActionDialog action={action} member={selectedMember} pending={mutation.isPending} error={mutation.error ? teamRequestError(mutation.error) : null} onClose={() => { if (!mutation.isPending) { setAction(null); setSelectedMember(null); mutation.reset(); } }} onSubmit={(profile) => { if (action && selectedMember) void mutation.mutateAsync({ requestedAction: action, member: selectedMember, profile }).catch(() => undefined); }} />
      <AddTeamMemberDialog
        visible={addOpen}
        pending={addMutation.isPending}
        error={addMutation.error ? teamRequestError(addMutation.error) : null}
        onClose={() => { if (!addMutation.isPending) { setAddOpen(false); addMutation.reset(); } }}
        onSubmit={(email, profile) => { void addMutation.mutateAsync({ email, profile }).catch(() => undefined); }}
      />
      <Snackbar visible={Boolean(feedback)} onDismiss={() => setFeedback(null)}>{feedback}</Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.lg },
  list: { paddingBottom: spacing.xl },
  emptyList: { flexGrow: 1 },
  header: { padding: spacing.md, gap: spacing.md, backgroundColor: colors.background },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  title: { color: colors.text, fontWeight: '800' },
  organization: { color: colors.textMuted, marginTop: 2 },
  summary: { color: colors.textMuted, backgroundColor: colors.surface, padding: spacing.sm },
  summaryAttention: { color: colors.warning, backgroundColor: colors.warningSoft, borderLeftColor: colors.warning, borderLeftWidth: 3 },
  invitations: { backgroundColor: colors.surface, padding: spacing.sm, gap: spacing.xs },
  invitationTitle: { color: colors.text, fontWeight: '700' },
  invitationRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  invitationEmail: { color: colors.text, flex: 1 },
  invitationState: { color: colors.textMuted },
  search: { backgroundColor: colors.surface, borderRadius: 8, minHeight: 48 },
  searchInput: { minHeight: 48, fontSize: 15 },
  filters: { gap: spacing.sm, paddingRight: spacing.md },
  count: { color: colors.textMuted, fontSize: 12 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm },
  emptyText: { color: colors.textMuted, textAlign: 'center' },
});
