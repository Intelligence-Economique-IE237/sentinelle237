import { db } from "../config/db";
import type { Prisma } from "@prisma/client";

export default class UserFluxRepository {
  private readonly db;
  constructor() {
    this.db = db;
  }

  async exists(user_id: string, flux_id: string): Promise<boolean> {
    const link = await this.db.userFlux.findUnique({
      where: { user_id_flux_id: { user_id, flux_id } },
    });
    return !!link;
  }

  async subscribe(user_id: string, flux_id: string) {
    return await this.db.userFlux.create({ data: { user_id, flux_id } });
  }

  async unsubscribe(user_id: string, flux_id: string) {
    return await this.db.userFlux.delete({
      where: { user_id_flux_id: { user_id, flux_id } },
    });
  }

  async countSubscribers(flux_id: string): Promise<number> {
    return await this.db.userFlux.count({ where: { flux_id } });
  }

  async getSubscribedFluxIds(user_id: string): Promise<string[]> {
    const links = await this.db.userFlux.findMany({ where: { user_id }, select: { flux_id: true } });
    return links.map((l) => l.flux_id);
  }

  // Strictement les flux liés à CET utilisateur, avec filtres optionnels par zone/type
  async getUserFlux(params: { user_id: string; skip: number; take: number; fluxWhere: Prisma.FluxWhereInput }) {
    const where: Prisma.UserFluxWhereInput = {
      user_id: params.user_id,
      flux: params.fluxWhere,
    };

    const [links, total] = await Promise.all([
      this.db.userFlux.findMany({
        where,
        include: { flux: true },
        orderBy: { createdAt: "desc" },
        skip: params.skip,
        take: params.take,
      }),
      this.db.userFlux.count({ where }),
    ]);

    return { flux: links.map((link) => link.flux), total };
  }
}