import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/providers/AuthProvider";
import { getApiErrorMessage } from "@/lib/apiError";

export const LoginPage: React.FC = () => {
	const navigate = useNavigate();
	const { login } = useAuth();
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");

	const mutation = useMutation({
		mutationFn: login,
		onSuccess: () => {
			navigate("/");
		},
	});

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		mutation.mutate({ username, password });
	};

	return (
		<div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
			<div className="w-full max-w-sm space-y-6 rounded-xl border border-border/60 bg-card/80 p-6 shadow-lg backdrop-blur">
				<div className="space-y-1 text-center">
					<h1 className="text-2xl font-semibold">Sign in</h1>
					<p className="text-sm text-muted-foreground">Access your saved workflows and sessions.</p>
				</div>

				<form className="space-y-4" onSubmit={handleSubmit}>
					<div className="space-y-2">
						<Label htmlFor="username">Username</Label>
						<Input
							id="username"
							name="username"
							autoComplete="username"
							value={username}
							onChange={(event) => setUsername(event.target.value)}
							disabled={mutation.isPending}
							required
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="password">Password</Label>
						<Input
							id="password"
							name="password"
							type="password"
							autoComplete="current-password"
							value={password}
							onChange={(event) => setPassword(event.target.value)}
							disabled={mutation.isPending}
							required
						/>
					</div>

					<Button type="submit" className="w-full" disabled={mutation.isPending}>
						{mutation.isPending ? "Signing in..." : "Sign in"}
					</Button>
				</form>

				{mutation.isError && (
					<Alert variant="destructive">
						<AlertTitle>Could not sign in</AlertTitle>
						<AlertDescription>{getApiErrorMessage(mutation.error, "Invalid username or password.")}</AlertDescription>
					</Alert>
				)}

				<p className="text-center text-sm text-muted-foreground">
					New here?{" "}
					<Link className="font-medium text-primary hover:underline" to="/register">
						Create an account
					</Link>
				</p>
			</div>
		</div>
	);
};
