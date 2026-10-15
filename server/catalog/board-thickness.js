const thicknesses=[18,16,12,6,3];
function thicknessVariants(materials){
 return materials.filter(m=>m.category==='Wood Boards & Plywood'&&m.unit==='sheet'&&(/particle|MDF|plywood|veneered|PVC|WPC|HPL board|melamine board/i.test(m.name))).flatMap(base=>thicknesses.map(mm=>({...base,code:base.code+'-T'+String(mm).padStart(2,'0'),name:base.name+' - '+mm+'mm',size:'Thickness: '+mm+' mm',specification:'Requested nominal thickness: '+mm+' mm. Company planning variant; brand availability, tolerance, sheet length/width, core, face and grade require supplier confirmation. Not a manufacturer SKU or availability guarantee.',description:base.description+' Company-requested thickness variant; thicknesses 18/16/12/6/3 mm are not confirmed for every brand/family.'})));
}
module.exports={thicknesses,thicknessVariants};
