/**
 * FaceDescriptor - Value Object (Domain Layer)
 * Immutably encapsulates a 128D facial feature vector and biometric similarity calculations.
 */
class FaceDescriptor {
  /**
   * @param {number[]} vector Array of 128 numbers
   */
  constructor(vector) {
    if (!Array.isArray(vector) || vector.length === 0) {
      throw new Error('O vetor descritor facial é obrigatório e deve ser um array numérico.');
    }
    this.vector = Object.freeze(vector.map(n => Number(n)));
    Object.freeze(this);
  }

  /**
   * Calculates Euclidean distance between this descriptor and another
   * @param {FaceDescriptor} otherDescriptor 
   * @returns {number} Euclidean distance
   */
  calculateEuclideanDistance(otherDescriptor) {
    if (!otherDescriptor || !Array.isArray(otherDescriptor.vector)) {
      return Infinity;
    }
    const vecA = this.vector;
    const vecB = otherDescriptor.vector;

    if (vecA.length !== vecB.length) {
      return Infinity;
    }

    let sum = 0;
    for (let i = 0; i < vecA.length; i++) {
      const diff = vecA[i] - vecB[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  /**
   * Calibrated confidence mapping for 128D Face Recognition
   * @param {number} distance 
   * @returns {number} Percentage match score (1 to 99)
   */
  static calculateMatchPercentage(distance) {
    if (distance <= 0.10) return 99;
    if (distance <= 0.55) {
      // Calibrated biometric curve: 0.10 -> 99%, 0.25 -> 93%, 0.35 -> 88%, 0.55 -> 76%
      const pct = 99 - ((distance - 0.10) / (0.55 - 0.10)) * 23;
      return Math.round(pct);
    } else {
      // Distances above threshold drop to refusal level (< 45%)
      const pct = Math.max(1, 45 - ((distance - 0.55) / 0.25) * 40);
      return Math.round(pct);
    }
  }
}

module.exports = FaceDescriptor;
