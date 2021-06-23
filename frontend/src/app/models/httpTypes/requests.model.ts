// Interfaces for the HTTP requests

export interface RequestBody {
}

export interface RegistrationRequestBody extends RequestBody {
  username: string,
  password: string,
  isModerator: boolean,
}

export interface StandardPlayerRegistrationRequestBody extends RegistrationRequestBody {
  isModerator: false,
  name: string,
  surname: string,
}

export interface ModeratorRegistrationRequestBody extends RegistrationRequestBody {
  isModerator: true,
}

// Type guard function
export function isStandardPlayerRegistrationRequestBody(arg: any): arg is StandardPlayerRegistrationRequestBody {
  return arg
    && arg.username
    && typeof (arg.username) === 'string'
    && arg.password
    && typeof (arg.password) === 'string'
    && arg.isModerator !== undefined && arg.isModerator !== null // Check explicity the inequality to undefined and null
    && !arg.isModerator
    && arg.name
    && typeof (arg.name) === 'string'
    && arg.surname
    && typeof (arg.surname) === 'string';
}

// Type guard function
export function isModeratorRegistrationRequestBody(arg: any): arg is ModeratorRegistrationRequestBody {
  return arg
    && arg.username
    && typeof (arg.username) === 'string'
    && arg.password
    && typeof (arg.password) === 'string'
    && arg.isModerator !== undefined && arg.isModerator !== null // Check explicity the inequality to undefined and null
    && arg.isModerator;
}

export interface ConfirmModeratorRequestBody extends RequestBody {
  password: string,
  name: string,
  surname: string,
}

// Type guard function
export function isConfirmModeratorRequestBody(arg: any): arg is ConfirmModeratorRequestBody {
  return arg
    && arg.password
    && typeof (arg.password) === 'string'
    && arg.name
    && typeof (arg.name) === 'string'
    && arg.surname
    && typeof (arg.surname) === 'string';
}

export interface NotifyAvailabilityFriendRequestRequestBody extends RequestBody {
  username: string,
}

// Type guard function
export function isNotifyAvailabilityFriendRequestRequestBody(arg: any): arg is NotifyAvailabilityFriendRequestRequestBody {
  return arg
    && arg.username
    && typeof (arg.username) === 'string';
}

export interface NotifyUnavailabilityFriendRequestRequestBody extends RequestBody {
  username: string,
}

// Type guard function
export function isNotifyUnavailabilityFriendRequestRequestBody(arg: any): arg is NotifyUnavailabilityFriendRequestRequestBody {
  return arg
    && arg.username
    && typeof (arg.username) === 'string';
}

export interface AddMoveRequestBody extends RequestBody {
  column: number,
}

// Type guard function
export function isAddMoveRequestBody(arg: any): arg is AddMoveRequestBody {
  return arg
    && arg.column !== undefined
    && typeof (arg.column) === 'number'; 
}

