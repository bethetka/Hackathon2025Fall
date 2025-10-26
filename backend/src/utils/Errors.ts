import { Errors as MErrors } from "moleculer"

const { MoleculerError } = MErrors

enum Errors {
	// common
	SOMETHING_WENT_WRONG,
	NOT_IMPLEMENTED,
	VALIDATION_ERROR,
	INSUFFICIENT_PERMISSIONS,

	// users
	UNAUTHORIZED,
	USER_WITH_THIS_USERNAME_ALREADY_EXISTS,
	INVALID_CREDENTIALS,
	YOU_CANNOT_DELETE_SESSION_THAT_IS_IN_USE,
	SESSION_NOT_FOUND,
	USER_NOT_FOUND,
	TOPOLOGY_NOT_FOUND,
	INVALID_TOPOLOGY_PAYLOAD,
}

const CodeRecord: Record<number, Errors[]> = {
	404: [Errors.TOPOLOGY_NOT_FOUND],
	403: [Errors.INSUFFICIENT_PERMISSIONS],
	401: [Errors.UNAUTHORIZED, Errors.INVALID_CREDENTIALS],
	400: [
		Errors.USER_NOT_FOUND,
		Errors.USER_WITH_THIS_USERNAME_ALREADY_EXISTS,
		Errors.VALIDATION_ERROR,
		Errors.YOU_CANNOT_DELETE_SESSION_THAT_IS_IN_USE,
		Errors.SESSION_NOT_FOUND,
		Errors.INVALID_TOPOLOGY_PAYLOAD,
	],
	500: [Errors.SOMETHING_WENT_WRONG],
	501: [Errors.NOT_IMPLEMENTED]
}

const CodeMap = new Map<Errors, number>
for (let code in CodeRecord)
	CodeRecord[code]!.forEach(value => CodeMap.set(value, Number(code)))

class ErrorBuilder {
	private error: Errors
	private options: {
		message?: string
		data?: any
	} = { message: "", data: null }

	constructor(error: Errors) {
		this.error = error
		return new Proxy(this, {
			get: (target, prop) => {
				if (prop in target)
					return target[prop as keyof ErrorBuilder]

				return target.createError()
			}
		})
	}

	message(message: string): ErrorBuilder {
		this.options.message = message
		return this
	}

	data(data: any): ErrorBuilder {
		this.options.data = data
		return this
	}

	private createError = () => {
		return new MoleculerError(
			this.options?.message ?? "",
			CodeMap.get(this.error) ?? 403,
			Errors[this.error],
			this.options?.data
		)
	}
}

const MakeError =
	(error: Errors, options?: { message?: string, data?: any }) =>
		Promise.reject(new MoleculerError(
			options?.message ?? "",
			CodeMap.get(error) ?? 403,
			Errors[error],
			options?.data
		))

export { Errors, MakeError, ErrorBuilder, MoleculerError }
