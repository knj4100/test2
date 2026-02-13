export interface ViewConfig {
  mode: 'default' | 'follow' | 'top' | 'section';
  followsVehicle: boolean;
  rotatesWithVehicle: boolean;
  targetType: 'body' | 'bucket';
  sideViewMode: 'true' | 'diagonal';
  topViewMode: 'true' | 'diagonal';
  sectionDirection: 'longitudinal' | 'transverse';
  sideCameraType: 'perspective' | 'orthographic';
  topCameraType: 'perspective' | 'orthographic';
  diagonalAngle: number;
  radius: number;
  height: number;
  targetHeight: number;
}

export const defaultViewConfig: ViewConfig = {
  mode: 'default',
  followsVehicle: true,
  rotatesWithVehicle: false,
  targetType: 'body',
  sideViewMode: 'true',
  topViewMode: 'true',
  sectionDirection: 'longitudinal',
  sideCameraType: 'perspective',
  topCameraType: 'perspective',
  diagonalAngle: 45,
  radius: 0.014,
  height: 0.008,
  targetHeight: 0.0015
};
