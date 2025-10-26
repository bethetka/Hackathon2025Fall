import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/providers/AuthProvider";
import { getApiErrorMessage } from "@/lib/apiError";

export const RegisterPage: React.FC = () => {
	const navigate = useNavigate();
	const { register } = useAuth();
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");

	const mutation = useMutation({
		mutationFn: register,
		onSuccess: () => {
			navigate("/");
		},
	});

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (password !== confirmPassword) {
			mutation.reset();
			return;
		}
		mutation.mutate({ username, password });
	};

	const isPasswordMismatch = password !== confirmPassword && confirmPassword.length > 0;

	return (
		<div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
			<div className="w-full max-w-sm space-y-6 rounded-xl border border-border/60 bg-card/80 p-6 shadow-lg backdrop-blur">
				<div className="space-y-1 text-center">
					<h1 className="text-2xl font-semibold">Create your account</h1>
					<p className="text-sm text-muted-foreground">Save and revisit your hackathon workflows.</p>
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
							autoComplete="new-password"
							value={password}
							onChange={(event) => setPassword(event.target.value)}
							disabled={mutation.isPending}
							required
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="confirmPassword">Confirm password</Label>
						<Input
							id="confirmPassword"
							name="confirmPassword"
							type="password"
							autoComplete="new-password"
							value={confirmPassword}
							onChange={(event) => setConfirmPassword(event.target.value)}
							disabled={mutation.isPending}
							required
							aria-invalid={isPasswordMismatch}
						/>
						{isPasswordMismatch && (
							<p className="text-xs font-medium text-destructive">Passwords must match.</p>
						)}
					</div>

					<Button type="submit" className="w-full" disabled={mutation.isPending || isPasswordMismatch}>
						{mutation.isPending ? "Creating account..." : "Create account"}
					</Button>
				</form>

				{mutation.isError && (
					<Alert variant="destructive">
						<AlertTitle>Could not create account</AlertTitle>
						<AlertDescription>
							{getApiErrorMessage(mutation.error, "Please try a different username.")}
						</AlertDescription>
					</Alert>
				)}

				<p className="text-center text-sm text-muted-foreground">
					Already have an account?{" "}
					<Link className="font-medium text-primary hover:underline" to="/login">
						Sign in
					</Link>
				</p>
			</div>
		</div>
	);
};
