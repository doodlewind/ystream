import * as authentication from '@y/stream/api/authentication'
import * as dbtypes from '@y/stream/api/dbtypes'
import * as buffer from 'lib0/buffer'
import * as json from 'lib0/json'
import * as ecdsa from 'lib0/crypto/ecdsa'
import * as decoding from 'lib0/decoding'

const testUserRaw = {
  privateKey: '{"key_ops":["sign"],"ext":true,"kty":"EC","x":"pAUmLYc-UFmPIt7leafPTbhxQyygcaW7__nPcUNCuu0wH27yS9P_pWFP1GwcsoAN","y":"u3109KjrPGsNUn2k5Whn2uHLAckQPdLNqtM4GpBEpUJwlvVDvk71-lS3YOEYJ_Sq","crv":"P-384","d":"OHnRw5an9hlSqSKg966lFRvB7dow669pVSn7sFZUi7UQh_Y9Xc95SQ6pEWsofsYD"}',
  user: 'AMgBeyJrZXlfb3BzIjpbInZlcmlmeSJdLCJleHQiOnRydWUsImt0eSI6IkVDIiwieCI6InBBVW1MWWMtVUZtUEl0N2xlYWZQVGJoeFF5eWdjYVc3X19uUGNVTkN1dTB3SDI3eVM5UF9wV0ZQMUd3Y3NvQU4iLCJ5IjoidTMxMDlLanJQR3NOVW4yazVXaG4ydUhMQWNrUVBkTE5xdE00R3BCRXBVSndsdlZEdms3MS1sUzNZT0VZSl9TcSIsImNydiI6IlAtMzg0In0='
}

const testServerUser = 'AMgBeyJrZXlfb3BzIjpbInZlcmlmeSJdLCJleHQiOnRydWUsImt0eSI6IkVDIiwieCI6IkNZd01ha3BuMG9uYU5lQ2Etd3FMbjRGenNyaXNfVVk0WjVnUlFVQTl4UU9vaDk0WUc5T0hoSXRyNnJvdmFZcFoiLCJ5IjoiNzRVbGp1ODZJVU1KWnNZc1NqeFNqdXNMamo5VTZyb3pad2JLOVhhcWozTWdJV3Ruak55akwxRC1Oek9QM0ZKNyIsImNydiI6IlAtMzg0In0='

const testUser = {
  privateKey: await ecdsa.importKeyJwk(json.parse(testUserRaw.privateKey)),
  user: dbtypes.UserIdentity.decode(decoding.createDecoder(buffer.fromBase64(testUserRaw.user)))
}

export const owner = buffer.toBase64(testUser.user.hash)

/** @param {import('@y/stream').Ydb} y */
export const initAuth = async (y) => {
  await authentication.registerUser(y, dbtypes.UserIdentity.decode(decoding.createDecoder(buffer.fromBase64(testServerUser))), { isTrusted: true })
  await authentication.setUserIdentity(y, testUser.user, await testUser.user.publicKey, testUser.privateKey)
}
