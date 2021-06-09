export interface RequestBody{    
}

export interface RegistrationRequestBody extends RequestBody{
  username: string,
  password: string,
  isModerator: boolean,
}

export interface StandardPlayerRegistrationRequestBody extends RegistrationRequestBody{
  isModerator: false,
  name: string,
  surname: string,
  avatar: string, // TODO capire come gestire
}

export interface ModeratorRegistrationRequestBody extends RegistrationRequestBody{
  isModerator: true,
}

export function isStandardPlayerRegistrationRequestBody(arg: any): arg is StandardPlayerRegistrationRequestBody {
  return arg 
         && arg.username
         && typeof(arg.username) === 'string'
         && arg.password
         && typeof(arg.password) === 'string'
         && arg.isModerator!=undefined && arg.isModerator!=null // Check explicity the inequality to undefined and null
         && !arg.isModerator
         && arg.name
         && typeof(arg.name) === 'string'
         && arg.surname
         && typeof(arg.surname) === 'string'
         && arg.avatar
         && typeof(arg.avatar) === 'string' ;
}

export function isModeratorRegistrationRequestBody(arg: any): arg is ModeratorRegistrationRequestBody {
  return arg 
         && arg.username
         && typeof(arg.username) == 'string'
         && arg.password
         && typeof(arg.password) == 'string'
         && arg.isModerator!=undefined && arg.isModerator!=null // Check explicity the inequality to undefined and null
         && arg.isModerator ;
}

export interface ConfirmModeratorRequestBody extends RequestBody{
  password: string,
  name: string,
  surname: string,
  avatar: string, // TODO capire come gestire
}

export function isConfirmModeratorRequestBody(arg: any): arg is ConfirmModeratorRequestBody {
  return arg 
         && arg.password
         && typeof(arg.password) === 'string'
         && arg.name
         && typeof(arg.name) === 'string'
         && arg.surname
         && typeof(arg.surname) === 'string'
         && arg.avatar
         && typeof(arg.avatar) === 'string' ;
}