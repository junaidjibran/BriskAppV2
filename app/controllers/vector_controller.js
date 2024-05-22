import prisma from "../db.server";

export async function prismaCreateVector({ titleEnglish, valueEnglish, titleUrdu, valueUrdu, imgCdn, vectorValueType, vectorType }) {
    return await prisma.vectors.create({
      // @ts-ignore
      data: {
        "title_english": titleEnglish,
        "value_english": valueEnglish,
        "title_urdu": titleUrdu,
        "value_urdu": valueUrdu,
        "img_cdn": imgCdn,
        "type": vectorType,
        "value_type": vectorValueType
      },
    });
  }
  
  export async function prismaGetVector() {
    return await prisma.vectors.findMany();
  }
  export async function prismaCheckVector({ titleEnglish, valueEnglish, vectorType, vectorValueType }) {
    console.log('vectorValueTypoeeeeeee', vectorValueType)
    if ( vectorValueType === 'Constant' && titleEnglish && valueEnglish) {
      return await prisma.vectors.findMany({
            where: {
              "title_english": titleEnglish,
              "value_english": valueEnglish,
              //"value_type": vectorValueType,
              "type": vectorType,
              "value_type": vectorValueType,
            },
        });
    } else if (vectorValueType === 'Dynamic' && titleEnglish && vectorType) {
      return await prisma.vectors.findMany({
            where: {
              "title_english": titleEnglish,
              "type": vectorType,
              "value_type": vectorValueType
              
            },
        });
      }
}
  
  export async function prismaDeleteVector({id}) {
    return await prisma.vectors.delete({ where: { "id": id } });
  }
  export async function prismaUpdateVector ({ titleEnglish, valueEnglish, titleUrdu, valueUrdu, imgCdn, id, vectorValueType, vectorType }) {
    console.log({ titleEnglish, valueEnglish, titleUrdu, valueUrdu, imgCdn, id })
    return await prisma.vectors.update({
      where: {
        "id": id
      },
      data: {
        "title_english": titleEnglish,
        "value_english": valueEnglish,
        "title_urdu": titleUrdu,
        "value_urdu": valueUrdu,
        "img_cdn": imgCdn,
        "type": vectorType,
        "value_type": vectorValueType
      },
    });
  }