import { expectAssignable, expectNotAssignable } from "tsd";
import { Check } from "@cesium/engine";

// Verify Check.* asserts expected type

let myVar: string | undefined;
Check.defined("defined", myVar);
expectNotAssignable<undefined>(myVar);

let myString: string | number | undefined;
Check.typeOf.string("string", myString);
expectAssignable<string>(myString);

let myFunc: undefined | string | (() => any);
Check.typeOf.func("function", myFunc);
expectAssignable<() => any>(myFunc);

let myObject: object | string | undefined;
Check.typeOf.object("object", myObject);
expectAssignable<object>(myObject);

let myBool: boolean | string | undefined;
Check.typeOf.bool("boolean", myBool);
expectAssignable<boolean>(myBool);

let myBigInt: BigInt | string | undefined;
Check.typeOf.number("BigInt", myBigInt);
expectAssignable<BigInt>(myBigInt);

let myNumber: string | number | undefined;
Check.typeOf.number("number", myNumber);
expectAssignable<number>(myNumber);

let myNumberLessThan: string | number | undefined;
Check.typeOf.number.lessThan("lessThan", myNumberLessThan, 100);
expectAssignable<number>(myNumberLessThan);

let myNumberLessThanEquals: string | number | undefined;
Check.typeOf.number.lessThanOrEquals(
  "lessThanEquals",
  myNumberLessThanEquals,
  100,
);
expectAssignable<number>(myNumberLessThanEquals);

let myNumberGreaterThan: string | number | undefined;
Check.typeOf.number.greaterThan("greaterThan", myNumberGreaterThan, 100);
expectAssignable<number>(myNumberGreaterThan);

let myNumberGreaterThanEquals: string | number | undefined;
Check.typeOf.number.greaterThanOrEquals(
  "greaterThanEquals",
  myNumberGreaterThanEquals,
  100,
);
expectAssignable<number>(myNumberGreaterThanEquals);
