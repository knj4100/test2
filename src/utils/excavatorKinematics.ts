/**
 * 掘削機の運動学計算ユーティリティ
 *
 * このモジュールは、掘削機の順運動学（Forward Kinematics）計算と
 * 座標変換を提供します。
 */
import * as THREE from 'three';

/**
 * 掘削機のピボットポイント定数（単一の真実の源）
 *
 * 各ピボットポイントは、その親グループのローカル座標系で定義されています：
 * - body: ベース回転のピボットポイント (Y軸回転)
 * - workEquipment: ブーム（作業装置）のピボットポイント (X軸回転)
 * - arm: アームのピボットポイント (X軸回転)
 * - backet: バケットのピボットポイント (X軸回転)
 * - cuttingEdge: バケットに対する切削エッジの位置
 */
export const EXCAVATOR_PIVOTS = {
  body: { x: -0.0014, y: 0.001, z: -0.0018 },
  workEquipment: { x: -0.00155, y: 0.00188, z: -0.00155 },
  arm: { x: -0.0015, y: 0.0032, z: 0.004 },
  backet: { x: -0.0015, y: 0.0006, z: 0.00265 },
  cuttingEdge: { x: -0.001, y: 0.0013, z: 0.00145 }
} as const;

/**
 * ドーザーのピボットポイント定数
 */
export const DOZER_PIVOTS = {
  blade: { x: 0.0, y: 0.002, z: 0.007 },
  cuttingEdge: { x: 0.0, y: 0.0, z: 0.01 }
} as const;

/**
 * バケット位置の順運動学（FK）計算
 *
 * 掘削機の各関節角度から、バケットの切削エッジ位置を
 * ローカル座標系で計算します。
 *
 * 計算手順：
 * 1. ベース回転行列（Y軸）
 * 2. ブーム回転行列（X軸）
 * 3. アーム回転行列（X軸）
 * 4. バケット回転行列（X軸）
 * 5. 最終行列 = Body × Boom × Arm × Backet
 * 6. 切削エッジ位置を最終行列で変換
 *
 * @param angles 関節角度（ラジアン）
 * @param angles.rotation ベース回転角度（Y軸）
 * @param angles.boom ブーム角度（X軸）
 * @param angles.arm アーム角度（X軸）
 * @param angles.backet バケット角度（X軸）
 * @returns ローカル空間でのバケット切削エッジ位置
 */
export function calculateBucketPosition(angles: {
  rotation: number;
  boom: number;
  arm: number;
  backet: number;
}): THREE.Vector3 {
  const { body, workEquipment, arm, backet, cuttingEdge } = EXCAVATOR_PIVOTS;

  // ベース回転行列（Y軸周りの回転）
  const mBody = new THREE.Matrix4()
    .multiply(new THREE.Matrix4().makeTranslation(body.x, body.y, body.z))
    .multiply(new THREE.Matrix4().makeRotationY(angles.rotation))
    .multiply(new THREE.Matrix4().makeTranslation(-body.x, -body.y, -body.z));

  // ブーム回転行列（X軸周りの回転）
  const mBoom = new THREE.Matrix4()
    .multiply(new THREE.Matrix4().makeTranslation(workEquipment.x, workEquipment.y, workEquipment.z))
    .multiply(new THREE.Matrix4().makeRotationX(angles.boom))
    .multiply(new THREE.Matrix4().makeTranslation(-workEquipment.x, -workEquipment.y, -workEquipment.z));

  // アーム回転行列（X軸周りの回転）
  const mArm = new THREE.Matrix4()
    .multiply(new THREE.Matrix4().makeTranslation(arm.x, arm.y, arm.z))
    .multiply(new THREE.Matrix4().makeRotationX(angles.arm))
    .multiply(new THREE.Matrix4().makeTranslation(-arm.x, -arm.y, -arm.z));

  // バケット回転行列（X軸周りの回転）
  const mBacket = new THREE.Matrix4()
    .multiply(new THREE.Matrix4().makeTranslation(backet.x, backet.y, backet.z))
    .multiply(new THREE.Matrix4().makeRotationX(angles.backet))
    .multiply(new THREE.Matrix4().makeTranslation(-backet.x, -backet.y, -backet.z));

  // 最終変換行列を計算
  const finalMatrix = new THREE.Matrix4()
    .multiply(mBody)
    .multiply(mBoom)
    .multiply(mArm)
    .multiply(mBacket);

  // 切削エッジ位置を変換
  const pos = new THREE.Vector3(cuttingEdge.x, cuttingEdge.y, cuttingEdge.z);
  pos.applyMatrix4(finalMatrix);

  return pos;
}

/**
 * ローカル座標をワールド座標に変換
 *
 * ビークルのローカル空間の位置を、ワールド空間に変換します。
 * 変換は以下の順序で実行されます：
 * 1. ベース回転（Y軸）を適用
 * 2. ベース位置を加算
 *
 * @param localPos ローカル空間での位置ベクトル
 * @param basePos ワールド空間でのビークルベース位置
 * @param baseRotation ビークルのベース回転角度（Y軸、ラジアン）
 * @returns ワールド空間での位置ベクトル
 */
export function toWorldSpace(
  localPos: THREE.Vector3,
  basePos: { x: number; y: number; z: number },
  baseRotation: number
): THREE.Vector3 {
  const pos = localPos.clone();
  pos.applyAxisAngle(new THREE.Vector3(0, 1, 0), baseRotation);
  pos.add(new THREE.Vector3(basePos.x, basePos.y, basePos.z));
  return pos;
}
