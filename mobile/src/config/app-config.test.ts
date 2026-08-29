import config from '../../app.config';

test('Android solicita somente internet e bloqueia permissões sensíveis', () => {
  expect(config.android?.permissions).toEqual(['INTERNET']);
  expect(config.android?.blockedPermissions).toEqual(expect.arrayContaining([
    'android.permission.CAMERA',
    'android.permission.ACCESS_FINE_LOCATION',
    'android.permission.ACCESS_COARSE_LOCATION',
    'android.permission.RECORD_AUDIO',
    'android.permission.READ_CONTACTS',
    'android.permission.READ_EXTERNAL_STORAGE',
  ]));
});
