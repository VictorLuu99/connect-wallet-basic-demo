export function isValidAbi(abi: any): boolean {
  // If not an array, it's not a valid ABI
  if (!Array.isArray(abi)) {
    return false;
  }

  // Check if all ABI items have the required properties
  return abi.every((item) => {
    // Every ABI item should be an object
    if (typeof item !== 'object' || item === null) {
      return false;
    }

    // Every ABI item needs a type
    if (!item.type) {
      return false;
    }

    // For functions, events, and errors, check required properties
    if (item.type === 'function' || item.type === 'event' || item.type === 'error') {
      // These types require a name
      if (typeof item.name !== 'string') {
        return false;
      }

      // These types require inputs array
      if (!Array.isArray(item.inputs)) {
        return false;
      }

      // Check all inputs have type property
      const validInputs = item.inputs.every((input: any) => input && typeof input.type === 'string');

      if (!validInputs) {
        return false;
      }

      // Functions require outputs array
      if (item.type === 'function') {
        if (!Array.isArray(item.outputs)) {
          return false;
        }

        // Check all outputs have type property
        const validOutputs = item.outputs.every((output: any) => output && typeof output.type === 'string');

        if (!validOutputs) {
          return false;
        }

        // Functions need stateMutability property
        if (!['pure', 'view', 'nonpayable', 'payable'].includes(item.stateMutability)) {
          return false;
        }
      }
    } else if (item.type !== 'constructor' && item.type !== 'receive' && item.type !== 'fallback') {
      // Unknown type that's not one of the valid ABI types
      return false;
    }

    return true;
  });
}

