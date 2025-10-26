import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/providers/AuthProvider";
import { api } from "@/lib/api";
import type { ApiSession } from "@/lib/apiTypes";
import { getApiErrorMessage } from "@/lib/apiError";
import { Loader2, LogOut, Trash2 } from "lucide-react";
import type { AxiosError } from "axios";
import { cn } from "@/lib/utils";

export const ProfilePage: React.FC = () => {
	const { user, token, isLoading: isAuthLoading, logout } = useAuth();
	const queryClient = useQueryClient();

	const sessionsQuery = useQuery<ApiSession[]>({
		queryKey: ["auth", "sessions"] as const,
		queryFn: async () => {
		   const response = await api.get<ApiSession[]>("/users/me/sessions");
			return response.data;
		},
		enabled: Boolean(token),
		refetchInterval: 60_000,
		retry: false,
	});

	useEffect(() => {
		if (sessionsQuery.error) {
			const axiosError = sessionsQuery.error as AxiosError;
			if (axiosError.response?.status === 401) {
				logout();
			}
		}
	}, [logout, sessionsQuery.error]);

	const deleteSession = useMutation<void, AxiosError, string>({
		mutationFn: async (sessionId) => {
			await api.delete(`/users/me/session/${sessionId}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["auth", "sessions"] });
		},
	});

	const sessions: ApiSession[] = sessionsQuery.data ?? [];
	const sessionsErrorMessage = sessionsQuery.isError
		? getApiErrorMessage(sessionsQuery.error, "Could not load sessions.")
		: null;

	if (!token && !isAuthLoading) {
		return <Navigate to="/login" replace />;
	}

	if (isAuthLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background text-foreground">
				<div className="flex items-center gap-3 text-sm text-muted-foreground">
					<Loader2 className="h-4 w-4 animate-spin" />
					Loading your profile...
				</div>
			</div>
		);
	}

	return (
		<div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-6 py-12 text-foreground">
			<header className="flex flex-col gap-1">
				<h1 className="text-3xl font-semibold">Profile</h1>
				<p className="text-sm text-muted-foreground">
					Manage your account and active sessions. Changes to your canvas persist only while signed in.
				</p>
			</header>

			<section className="space-y-4 rounded-xl border border-border/60 bg-card/80 p-6 shadow-sm backdrop-blur">
				<div className="flex items-start justify-between gap-4">
					<div>
						<p className="text-sm text-muted-foreground">Signed in as</p>
						<p className="text-xl font-semibold">{user?.username}</p>
					</div>
					<Button variant="outline" onClick={logout} className="gap-2">
						<LogOut className="h-4 w-4" />
						Log out
					</Button>
				</div>
			</section>

			<section className="space-y-4 rounded-xl border border-border/60 bg-card/80 p-6 shadow-sm backdrop-blur">
				<div>
					<h2 className="text-lg font-semibold">Sessions</h2>
					<p className="text-sm text-muted-foreground">
						End sessions you no longer recognise. The current session cannot be removed from here.
					</p>
				</div>

				{sessionsErrorMessage && (
					<Alert variant="destructive">
						<AlertTitle>We hit a snag</AlertTitle>
						<AlertDescription>{sessionsErrorMessage}</AlertDescription>
					</Alert>
				)}

				{sessionsQuery.isPending ? (
					<div className="flex items-center gap-3 text-sm text-muted-foreground">
						<Loader2 className="h-4 w-4 animate-spin" />
						Fetching sessions...
					</div>
				) : sessions.length === 0 ? (
					<p className="text-sm text-muted-foreground">No other sessions found.</p>
				) : (
					<ul className="space-y-3">
						{sessions.map((session) => (
							<li
								key={session._id}
								className={cn(
									"flex flex-col gap-3 rounded-lg border border-border/60 bg-background/60 p-4 sm:flex-row sm:items-center sm:justify-between",
									session.current && "border-primary"
								)}
							>
								<div className="space-y-1 text-sm">
									<div className="flex flex-wrap items-center gap-2 font-medium">
										<span>Session {session._id.slice(-6).toUpperCase()}</span>
										{session.current && (
											<span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
												Current session
											</span>
										)}
									</div>
									{/* <p className="text-muted-foreground">
										User agent: {session.userAgent || "Unknown"}
									</p> */}
									<p className="text-muted-foreground">
										Last used: {formatDate(session.lastUse)}
									</p>
									{session.createdAt && (
										<p className="text-muted-foreground">
											Created: {formatDate(session.createdAt)}
										</p>
									)}
								</div>

								<Button
									variant="outline"
									className="gap-2 self-start sm:self-auto"
									disabled={session.current || deleteSession.isPending}
									onClick={() => deleteSession.mutate(session._id)}
								>
									<Trash2 className="h-4 w-4" />
									End session
								</Button>
							</li>
						))}
					</ul>
				)}

				{deleteSession.isError && (
					<Alert variant="destructive">
						<AlertTitle>Could not end session</AlertTitle>
						<AlertDescription>
							{getApiErrorMessage(deleteSession.error, "Please try again later.")}
						</AlertDescription>
					</Alert>
				)}
			</section>
		</div>
	);
};

function formatDate(input: string): string {
	const date = new Date(input);
	if (Number.isNaN(date.getTime())) return input;
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(date);
}
