import { RoleChangeConfirmationModal } from "@/components/profile/RoleChangeConfirmationModal";
import { currentUser } from "@/server/auth/currentUser";
import {
  listAdminProfileUsers,
  updateAdminUserRole,
  type AdminProfileUser,
  type UserRoleValue,
} from "@/serverFns/adminUsers.server";
import { updateProfile } from "@/serverFns/updateProfile.server";
import {
  Container,
  Group,
  Paper,
  Stack,
  Tabs,
  Text,
  Title,
} from "@mantine/core";
import { IconSettings, IconUsers } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AccountInformationCard } from "@/components/profile/AccountInformationCard";
import { PersonalInfoCard } from "@/components/profile/PersonalInfoCard";
import { UserManagementCard } from "@/components/profile/UserManagementCard";
import { getDisplayName } from "../../hooks/profileUtils";

export const Route = createFileRoute("/profile/")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: userData, isLoading } = useQuery({
    queryKey: ["currentUser"],
    queryFn: currentUser,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingRoleByUserId, setPendingRoleByUserId] = useState<
    Record<string, UserRoleValue>
  >({});
  const [roleConfirmTarget, setRoleConfirmTarget] = useState<{
    user: AdminProfileUser;
    nextRole: UserRoleValue;
  } | null>(null);

  if (!isLoading && !userData?.loggedIn) {
    navigate({ to: "/login", search: { target: "/profile" } });
    return null;
  }

  const user = userData?.user;
  if (!user) {
    return null;
  }

  const isAdmin = user?.role === "ADMIN";

  const {
    data: adminUsers = [],
    isLoading: isLoadingAdminUsers,
    error: adminUsersError,
  } = useQuery<AdminProfileUser[]>({
    queryKey: ["admin-profile-users"],
    queryFn: listAdminProfileUsers,
    enabled: isAdmin,
  });

  const { mutateAsync: changeUserRole, isPending: isUpdatingUserRole } =
    useMutation({
      mutationFn: ({ userId, role }: { userId: string; role: UserRoleValue }) =>
        updateAdminUserRole({ data: { userId, role } }),
    });

  const handleEditClick = () => {
    setFirstName(user?.firstName || "");
    setLastName(user?.lastName || "");
    setIsEditing(true);
    setError(null);
    setSuccess(null);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setError(null);
    setSuccess(null);
  };

  const handleSave = async () => {
    if (!firstName.trim()) {
      setError("First name is required");
      return;
    }

    if (!lastName.trim()) {
      setError("Last name is required");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await updateProfile({
        data: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        },
      });

      if (result.success) {
        await queryClient.invalidateQueries({ queryKey: ["currentUser"] });
        setIsEditing(false);
        setSuccess("Profile updated successfully!");
      } else {
        setError(result.error || "Failed to update profile");
      }
    } catch (err) {
      console.error("Profile update error:", err);
      setError("An unexpected error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const roleOptions = [
    { value: "ADMIN", label: "ADMIN" },
    { value: "CURATOR", label: "CURATOR" },
    { value: "EXTRACTOR", label: "EXTRACTOR" },
  ] satisfies Array<{ value: UserRoleValue; label: string }>;

  const handleRoleSelection = (
    targetUser: AdminProfileUser,
    value: string | null,
  ) => {
    if (!value) return;

    const nextRole = value as UserRoleValue;

    setPendingRoleByUserId((current) => ({
      ...current,
      [targetUser.id]: nextRole,
    }));

    if (nextRole === targetUser.role) return;

    setRoleConfirmTarget({
      user: targetUser,
      nextRole,
    });
    setError(null);
    setSuccess(null);
  };

  const handleRoleConfirmCancel = () => {
    if (roleConfirmTarget) {
      setPendingRoleByUserId((current) => ({
        ...current,
        [roleConfirmTarget.user.id]: roleConfirmTarget.user.role,
      }));
    }

    setRoleConfirmTarget(null);
  };

  const handleRoleConfirm = async () => {
    if (!roleConfirmTarget) return;

    setError(null);
    setSuccess(null);

    const result = await changeUserRole({
      userId: roleConfirmTarget.user.id,
      role: roleConfirmTarget.nextRole,
    });

    if (result.success) {
      await queryClient.invalidateQueries({
        queryKey: ["admin-profile-users"],
      });
      await queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      setSuccess(
        `Updated ${getDisplayName(roleConfirmTarget.user)} to ${roleConfirmTarget.nextRole}.`,
      );
      setRoleConfirmTarget(null);
      return;
    }

    setPendingRoleByUserId((current) => ({
      ...current,
      [roleConfirmTarget.user.id]: roleConfirmTarget.user.role,
    }));
    setError(result.error || "Failed to update user role");
    setRoleConfirmTarget(null);
  };

  if (isLoading) {
    return (
      <Container size="sm" mt="xl">
        <Paper shadow="sm" p="xl" withBorder>
          <Stack align="center">
            <Text>Loading...</Text>
          </Stack>
        </Paper>
      </Container>
    );
  }

  return (
    <Container size={isAdmin ? "lg" : "sm"} mt="xl">
      {isAdmin ? (
        <Paper shadow="sm" p="xl" withBorder>
          <Tabs defaultValue="personal" keepMounted={false}>
            <Stack gap="lg">
              <Group justify="space-between">
                <Title order={2}>Profile</Title>
              </Group>

              <Tabs.List>
                <Tabs.Tab
                  value="personal"
                  leftSection={<IconSettings size={16} />}
                >
                  Personal Info
                </Tabs.Tab>
                <Tabs.Tab value="users" leftSection={<IconUsers size={16} />}>
                  Manage Users
                </Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="personal">
                <Stack gap="md">
                  <PersonalInfoCard
                    user={user}
                    title="Personal Info"
                    titleOrder={3}
                    isEditing={isEditing}
                    firstName={firstName}
                    lastName={lastName}
                    isSaving={isSaving}
                    error={error}
                    success={success}
                    onClearError={() => setError(null)}
                    onClearSuccess={() => setSuccess(null)}
                    onEdit={handleEditClick}
                    onCancel={handleCancelEdit}
                    onSave={handleSave}
                    onFirstNameChange={setFirstName}
                    onLastNameChange={setLastName}
                  />

                  <AccountInformationCard user={user} />
                </Stack>
              </Tabs.Panel>

              <Tabs.Panel value="users">
                <UserManagementCard
                  users={adminUsers}
                  isLoading={isLoadingAdminUsers}
                  hasLoadError={!!adminUsersError}
                  isUpdatingRole={isUpdatingUserRole}
                  pendingRoleByUserId={pendingRoleByUserId}
                  roleOptions={roleOptions}
                  error={error}
                  success={success}
                  onClearError={() => setError(null)}
                  onClearSuccess={() => setSuccess(null)}
                  onRoleSelection={handleRoleSelection}
                />
              </Tabs.Panel>
            </Stack>
          </Tabs>
        </Paper>
      ) : (
        <>
          <PersonalInfoCard
            user={user}
            title="Profile"
            titleOrder={2}
            isEditing={isEditing}
            firstName={firstName}
            lastName={lastName}
            isSaving={isSaving}
            error={error}
            success={success}
            onClearError={() => setError(null)}
            onClearSuccess={() => setSuccess(null)}
            onEdit={handleEditClick}
            onCancel={handleCancelEdit}
            onSave={handleSave}
            onFirstNameChange={setFirstName}
            onLastNameChange={setLastName}
          />

          <AccountInformationCard user={user} />
        </>
      )}

      <RoleChangeConfirmationModal
        target={roleConfirmTarget}
        loading={isUpdatingUserRole}
        onCancel={handleRoleConfirmCancel}
        onConfirm={handleRoleConfirm}
      />
    </Container>
  );
}
