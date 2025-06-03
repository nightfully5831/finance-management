export const DOC_STATUS = {
  active: 1,
  inactive: 2,
  archived: 3,
  deleted: 4,
}

export const getKeyByValue = (object, value) => Object.keys(object).find((key) => object[key] === value)

export const getStatusByValue = (value) => getKeyByValue(USER_STATUS, value)
export const getRoleByValue = (value) => getKeyByValue(USER_ROLE, value)

// Biddi Cars Configs

export const CHALLENGE_STATUS = {
  LIV: 'live',
  CLT: 'completed',
}

export const USER_LEVELS = {
  BEG: 'Beginner',
  INT: 'Intermediate',
  FN: 'Fitness Novice',
  FP: 'Fitness Pro',
  EV: 'Expert Verified',
}

export const USER_TYPES = {
  SYS: 'System',
  USR: 'User',
}

export const SYSTEM_STAFF_ROLE = {
  SSA: 'System Admin',
}

export const SYSTEM_USER_ROLE = {
  USR: 'Zeal User',
}

export const getRoleShortName = (userType, role) => {
  if (userType == USER_TYPES.SYS) {
    return Object.keys(SYSTEM_STAFF_ROLE).find((k) => SYSTEM_STAFF_ROLE[k] === role)
  } else {
    return Object.keys(SYSTEM_USER_ROLE).find((k) => SYSTEM_USER_ROLE[k] === role)
  }
}

export const PLAN_TYPES = {
  free: "price_1R0Xe902EF3FQcIQvGKOMZ9S", common:"price_1R1clP02EF3FQcIQYmFj9rxn", pro:"price_1R0XeD02EF3FQcIQDMxYwv7D"
}