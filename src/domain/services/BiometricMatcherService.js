const FaceDescriptor = require('../value-objects/FaceDescriptor');

/**
 * BiometricMatcherService (Domain Service)
 * Encapsulates face matching logic against registered domain entities.
 */
class BiometricMatcherService {
  /**
   * @param {number[]} inputDescriptorArray Raw 128D array from client
   * @param {User[]} users List of registered domain User entities
   * @param {number} threshold Euclidean distance threshold
   * @returns {{ matchedUser: User|null, minDistance: number, matchPercentage: number, isMatch: boolean }}
   */
  matchFace(inputDescriptorArray, users, threshold = 0.55) {
    const inputDescriptor = new FaceDescriptor(inputDescriptorArray);

    if (!Array.isArray(users) || users.length === 0) {
      return {
        matchedUser: null,
        minDistance: Infinity,
        matchPercentage: 0,
        isMatch: false
      };
    }

    let minDistance = Infinity;
    let matchedUser = null;

    for (const user of users) {
      const distance = inputDescriptor.calculateEuclideanDistance(user.faceDescriptor);
      if (distance < minDistance) {
        minDistance = distance;
        matchedUser = user;
      }
    }

    const isMatch = minDistance <= threshold && matchedUser !== null;
    const matchPercentage = FaceDescriptor.calculateMatchPercentage(minDistance);

    return {
      matchedUser: isMatch ? matchedUser : null,
      minDistance: minDistance === Infinity ? null : Number(minDistance.toFixed(4)),
      matchPercentage: isMatch ? matchPercentage : Math.min(matchPercentage, 40),
      isMatch
    };
  }
}

module.exports = BiometricMatcherService;
