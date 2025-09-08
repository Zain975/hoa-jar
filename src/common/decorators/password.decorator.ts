import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') return false;
          
          // At least 6 characters
          if (value.length < 6) return false;
          
          // At least one capital letter
          if (!/[A-Z]/.test(value)) return false;
          
          // At least one number
          if (!/[0-9]/.test(value)) return false;
          
          // At least one special character
          if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) return false;
          
          return true;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be at least 6 characters long and contain at least one capital letter, one number, and one special character`;
        },
      },
    });
  };
}
