// pdfmake ships without type declarations. makePdf.ts describes the few
// functions it uses, so these modules are declared loosely here.
declare module 'pdfmake/build/pdfmake' {
  const pdfMake: unknown;
  export default pdfMake;
}

declare module 'pdfmake/build/vfs_fonts' {
  const vfs: unknown;
  export default vfs;
}
