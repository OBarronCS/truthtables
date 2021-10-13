

export type CheckedResult<T, E> = IValidResult<T> | IErrorResult<E>;

export interface IValidResult<T> {
    success: true,
    value: T
}

export interface IErrorResult<E> {
    success: false,
    error: E
}

export function ValidResult<T>(value: T): IValidResult<T> {
    return {
        success: true,
        value: value,
    }
}


export function ErrorResult<E>(err: E): IErrorResult<E> {
    return {
        success: false,
        error: err
    } 
}



