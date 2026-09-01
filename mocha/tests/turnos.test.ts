  describe('hayDisponibilidad', () => {
    it('debería retornar true si el horario y fecha están libres', () => {
      const res = hayDisponibilidad(turnosMock, '2026-09-01', '11:00');
      expect(res).to.be.true;
    });

    it('debería retornar false si el horario ya está ocupado en la misma fecha', () => {
      const res = hayDisponibilidad(turnosMock, '2026-09-01', '10:00');
      expect(res).to.be.false;
    });

    it('debería retornar true si el horario coincide pero en fecha diferente', () => {
      const res = hayDisponibilidad(turnosMock, '2026-09-03', '10:00');
      expect(res).to.be.true;
    });

    it('debería retornar true cuando la lista de turnos actuales está vacía', () => {
      const res = hayDisponibilidad([], '2026-09-01', '10:00');
      expect(res).to.be.true;
    });
  });
  describe('reservarTurno', () => {
    it('debería agregar exitosamente un turno si la ranura está disponible', () => {
      const nuevoTurno = { fecha: '2026-09-01', hora: '11:00', paciente: 'Ana Díaz' };
      const resultado = reservarTurno(turnosMock, nuevoTurno);

      expect(resultado).to.have.lengthOf(4);
      expect(resultado[3]).to.include({ fecha: '2026-09-01', hora: '11:00', paciente: 'Ana Díaz' });
      expect(resultado[3]).to.have.property('id');
    });

    it('debería lanzar un TurnoOcupadoError si la ranura ya está reservada', () => {
      const nuevoTurno = { fecha: '2026-09-01', hora: '10:00', paciente: 'Ana Díaz' };

      expect(() => reservarTurno(turnosMock, nuevoTurno))
        .to.throw(TurnoOcupadoError);
    });
    it('debería lanzar un TurnoInvalidoError si falta el campo de fecha', () => {
      const turnoIncompleto = { fecha: '', hora: '10:00', paciente: 'Ana Díaz' };

      expect(() => reservarTurno(turnosMock, turnoIncompleto))
        .to.throw(TurnoInvalidoError);
    });

    it('debería lanzar un TurnoInvalidoError si falta el campo de hora', () => {
      const turnoIncompleto = { fecha: '2026-09-01', hora: '', paciente: 'Ana Díaz' };

      expect(() => reservarTurno(turnosMock, turnoIncompleto))
        .to.throw(TurnoInvalidoError);
    });

    it('debería lanzar un TurnoInvalidoError si falta el paciente', () => {
      const turnoIncompleto = { fecha: '2026-09-01', hora: '10:00', paciente: '' };

      expect(() => reservarTurno(turnosMock, turnoIncompleto))
        .to.throw(TurnoInvalidoError);
    });

    it('debería generar un ID único auto-calculado para cada reserva exitosa', () => {
      const nuevo1 = { fecha: '2026-09-05', hora: '08:00', paciente: 'Paciente A' };
      const nuevo2 = { fecha: '2026-09-05', hora: '09:00', paciente: 'Paciente B' };

      const suite1 = reservarTurno(turnosMock, nuevo1);
      const suite2 = reservarTurno(suite1, nuevo2);

      const id1 = suite2[3].id;
      const id2 = suite2[4].id;

      expect(id1).to.not.equal(id2);
    });

    it('no debería mutar el arreglo de entrada (principio de inmutabilidad funcional)', () => {
      const nuevoTurno = { fecha: '2026-09-05', hora: '15:00', paciente: 'Paciente Test' };
      const longitudOriginal = turnosMock.length;

      reservarTurno(turnosMock, nuevoTurno);

      expect(turnosMock).to.have.lengthOf(longitudOriginal);
    });
  });

  describe('cancelarTurno', () => {
    it('debería eliminar correctamente el turno que coincida con el ID', () => {
      const resultado = cancelarTurno(turnosMock, '2');

      expect(resultado).to.have.lengthOf(2);
      expect(resultado.some(t => t.id === '2')).to.be.false;
    });

    it('debería arrojar un error si el ID a cancelar no existe en la lista', () => {
      expect(() => cancelarTurno(turnosMock, '999'))
        .to.throw('No se encontró ningún turno con el ID provisto.');
    });

    it('no debería alterar la reserva de los demás IDs activos', () => {
      const resultado = cancelarTurno(turnosMock, '2');

      expect(resultado[0].id).to.equal('1');
      expect(resultado[1].id).to.equal('3');
    });
  });

  describe('listarTurnosPorFecha', () => {
    it('debería retornar un arreglo filtrado únicamente con los turnos de la fecha indicada', () => {
      const resultado = listarTurnosPorFecha(turnosMock, '2026-09-01');

      expect(resultado).to.have.lengthOf(2);
      expect(resultado[0].fecha).to.equal('2026-09-01');
      expect(resultado[1].fecha).to.equal('2026-09-01');
    });

    it('debería retornar un arreglo vacío si no hay reservas registradas para esa fecha', () => {
      const resultado = listarTurnosPorFecha(turnosMock, '2026-12-25');

      expect(resultado).to.be.an('array').that.is.empty;
    });

    it('debería mantener todos los datos del paciente intactos al listar', () => {
      const resultado = listarTurnosPorFecha(turnosMock, '2026-09-02');

      expect(resultado[0]).to.deep.equal({
        id: '3',
        fecha: '2026-09-02',
        hora: '11:00',
        paciente: 'Carlos Gómez'
      });
    });
  });
});
class ServicioNotificacion {
  notificar(mensaje: string): void {
    console.log(`[API REAL EXTERNA]: ${mensaje}`);
  }
}

class GestorDeTurnos {
  private notificador: ServicioNotificacion;

  constructor(notificador: ServicioNotificacion) {
    this.notificador = notificador;
  }

  procesarCancelacionSegura(turnos: Turno[], id: string): Turno[] {
    const listadoActualizado = cancelarTurno(turnos, id);
    this.notificador.notificar(`Turno con ID ${id} cancelado exitosamente.`);
    return listadoActualizado;
  }
}
describe('GestorDeTurnos con Inyección de Dependencias (Sinon Mocks/Spies)', () => {
  it('debería llamar al servicio externo de notificación exactamente una vez con Sinon Spy', () => {
    const notificadorReal = new ServicioNotificacion();
    const spyNotificacion = sinon.spy(notificadorReal, 'notificar');
    const gestor = new GestorDeTurnos(notificadorReal);
    const turnosPrueba = [{ id: '123', fecha: '2026-09-01', hora: '10:00', paciente: 'Prueba' }];
    gestor.procesarCancelacionSegura(turnosPrueba, '123');
    expect(spyNotificacion.calledOnce).to.be.true;
    expect(spyNotificacion.firstCall.args[0]).to.include('Turno con ID 123 cancelado exitosamente.');
    spyNotificacion.restore();


