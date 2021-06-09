export interface ResponseBody{
    error: boolean,
    statusCode: number,
}

export interface RootResponseBody extends ResponseBody { 
    apiVersion: string,   
    endpoints: string[],
}

export interface LoginResponseBody extends ResponseBody{
    error: false,
    token: string,
}

export interface RegistrationResponseBody extends LoginResponseBody{    
}

export interface ErrorResponseBody extends ResponseBody{
    error: true,
    errorMessage: string,
}